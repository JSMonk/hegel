// @flow
import HegelError from "../utils/errors";
import { getTypeFromTypeAnnotation, getNameForType } from "../utils/utils";
import type {
  SourceLocation,
  TypeAnnotation,
  TypeParameter
} from "@babel/parser";

export const UNDEFINED_TYPE = "?";
export const TYPE_SCOPE = "[[TypeScope]]";

export type GraphElement = Scope | VariableInfo;

export type TypeGraph = Map<string, GraphElement>;

const ZeroLocation: SourceLocation = {
  start: { column: -1, line: -1 },
  end: { column: -1, line: -1 }
};

export class Meta {
  loc: SourceLocation;

  constructor(loc: SourceLocation) {
    this.loc = loc;
  }
}

export class CallMeta extends Meta {
  target: Type;
  arguments: Array<Type>;

  constructor(
    target: Type,
    args: Array<Type>,
    loc: SourceLocation
  ) {
    super(loc);
    this.target = target;
    this.arguments = args;
  }
}

export class ModuleScope {
  body: TypeGraph;
  parent: void;
  calls: Array<CallMeta> = [];

  constructor(body?: TypeGraph = new Map()) {
    this.body = body;
  }
}

type TypeMeta = {
  isNullable?: boolean,
  isOptional?: boolean,
  isLiteral?: boolean
};

const createTypeWithName = <T: Type>(BaseType: Class<T>) => (
  name: string,
  typeScope: Scope,
  ...args
): T => {
  if (name === UNDEFINED_TYPE) {
    return new BaseType(name, ...args);
  }
  let existedType = typeScope.body.get(name);
  const newType = new BaseType(name, ...args);
  if (
    !existedType ||
    !(existedType instanceof VariableInfo) ||
    !(existedType.type instanceof BaseType) ||
    !existedType.type.equalsTo(newType)
  ) {
    existedType = new VariableInfo(newType, typeScope, ZeroLocation);
    typeScope.body.set(name, existedType);
    return newType;
  }

  return existedType.type;
};

export class Type {
  static createTypeWithName = createTypeWithName(Type);

  name: mixed;
  isNullable: boolean;
  isOptional: boolean;
  isLiteral: boolean;

  constructor(name: mixed, meta?: TypeMeta = {}) {
    this.name = name;
    const { isLiteral = false, isOptional = false, isNullable = false } = meta;
    this.isOptional = isOptional;
    this.isNullable = isNullable;
    this.isLiteral = isLiteral;
  }

  equalsTo(anotherType: Type) {
    return (
      this.name === anotherType.name &&
      this.isOptional === anotherType.isOptional &&
      this.isNullable === anotherType.isNullable &&
      this.isLiteral === anotherType.isLiteral
    );
  }
}

export class ObjectType extends Type {
  static createTypeWithName = createTypeWithName(ObjectType);

  properties: Map<string, VariableInfo>;

  constructor(
    name: string,
    properties: Array<[string, VariableInfo]>,
    meta?: TypeMeta = {}
  ) {
    super(name, { ...meta, isLiteral: true });
    this.properties = new Map(properties);
  }

  equalsTo(anotherType: Type) {
    if (
      !(anotherType instanceof ObjectType) ||
      anotherType.properties.size !== this.properties.size ||
      !super.equalsTo(anotherType)
    ) {
      return false;
    }
    for (const [key, { type }] of this.properties) {
      const anotherPropertyType = anotherType.properties.get(key);
      if (!anotherPropertyType || !type.equalsTo(anotherPropertyType.type)) {
        return false;
      }
    }
    return true;
  }
}

export class GenericType extends Type {
  static createTypeWithName = createTypeWithName(GenericType);

  genericArguments: Array<Type>;
  astTypeAnnotation: TypeAnnotation;
  localTypeScope: Scope;
  parentTypeScope: Scope;

  constructor(
    name: string,
    genericArguments: Array<TypeParameter | Type>,
    typeScope: Scope,
    astTypeAnnotation: TypeAnnotation,
    meta?: TypeMeta
  ) {
    super(name, meta);
    this.parentTypeScope = typeScope;
    this.astTypeAnnotation = astTypeAnnotation;
    this.localTypeScope = new Scope(Scope.BLOCK_TYPE, typeScope);
    this.localTypeScope.body = new Map(typeScope.body);
    if (genericArguments.length && genericArguments[0] instanceof Type) {
      this.genericArguments = genericArguments;
    } else {
      this.genericArguments = genericArguments.map((type: TypeParameter) => {
        const paramType = getTypeFromTypeAnnotation(
          { typeAnnotation: type },
          this.localTypeScope
        );
        if (type.bound) {
          this.localTypeScope.body.set(
            type.name,
            new VariableInfo(paramType, this.localTypeScope, new Meta(type.loc))
          );
        }
        return paramType;
      });
    }
  }

  applyGeneric(parameters: Array<Type>, loc: SourceLocation): Type {
    if (parameters.length !== this.genericArguments.length) {
      throw new HegelError(
        `Generic '${String(
          this.name
        )}' called with wrong number of arguments. Expect: ${
          this.genericArguments.length
        }, Actual: #{parameters.length}`,
        loc
      );
    }
    const appliedTypeName = `${String(this.name)}<${parameters.reduce(
      (res, t) => `${res}${res ? ", " : ""}${getNameForType(t)}`,
      ""
    )}>`;
    const existedType = this.parentTypeScope.body.get(appliedTypeName);
    if (existedType && existedType instanceof VariableInfo) {
      return existedType.type;
    }
    for (let i = 0; i < parameters.length; i++) {
      const appliedType = parameters[i];
      const declaredType = this.genericArguments[i];
      const aliasInLocalScope = this.localTypeScope.body.get(
        String(declaredType.name)
      );
      if (!aliasInLocalScope || !(aliasInLocalScope instanceof VariableInfo)) {
        throw new Error("NEVER!!!");
      }
      aliasInLocalScope.type = appliedType;
    }
    const result = getTypeFromTypeAnnotation(
      { typeAnnotation: this.astTypeAnnotation },
      this.localTypeScope,
      false
    );
    this.parentTypeScope.body.set(
      appliedTypeName,
      /*::(*/

      this.localTypeScope.body.get(String(result.name)) ||
        this.parentTypeScope.body.get(String(result.name))
      /*:: :any)*/
    );
    return result;
  }
}

export class FunctionType extends Type {
  static createTypeWithName = createTypeWithName(FunctionType);

  argumentsTypes: Array<Type>;
  returnType: Type;

  constructor(name: string, argumentsTypes: Array<Type>, returnType: Type) {
    super(name, { isLiteral: true });
    this.argumentsTypes = argumentsTypes;
    this.returnType = returnType;
  }

  equalsTo(anotherType: Type) {
    const argumentsTypes =
      anotherType instanceof FunctionType ? anotherType.argumentsTypes : [];
    return (
      anotherType instanceof FunctionType &&
      super.equalsTo(anotherType) &&
      this.returnType.equalsTo(anotherType.returnType) &&
      this.argumentsTypes.length === argumentsTypes.length &&
      this.argumentsTypes.every((type, index) =>
        type.equalsTo(argumentsTypes[index])
      )
    );
  }
}

export class UnionType extends Type {
  static createTypeWithName = createTypeWithName(UnionType);

  variants: Array<Type>;

  constructor(name: string, variants: Array<Type>, meta: TypeMeta = {}) {
    super(name, {});
    this.variants = variants;
  }

  equalsTo(anotherType: Type) {
    const anotherVariants =
      anotherType instanceof UnionType ? anotherType.variants : [];
    return (
      anotherType instanceof UnionType &&
      super.equalsTo(anotherType) &&
      this.variants.length === anotherVariants.length &&
      this.variants.every((type, index) =>
        type.equalsTo(anotherVariants[index])
      )
    );
  }
}

export class Scope {
  static BLOCK_TYPE = "block";
  static FUNCTION_TYPE = "function";
  static OBJECT_TYPE = "object";
  static CLASS_TYPE = "class";

  type: "block" | "function" | "object" | "class";
  parent: Scope | ModuleScope;
  body: TypeGraph = new Map();
  calls: Array<CallMeta> = [];
  declaration: ?VariableInfo;

  constructor(
    type: $PropertyType<this, "type">,
    parent: ModuleScope | Scope,
    declaration?: VariableInfo
  ) {
    this.type = type;
    this.parent = parent;
    this.declaration = declaration;
  }
}

export class VariableInfo {
  type: Type;
  parent: ?Scope | ?ModuleScope;
  meta: Meta;

  constructor(type: Type, parent: ?Scope | ?ModuleScope, meta: Meta) {
    this.type = type;
    this.parent = parent;
    this.meta = meta;
  }
}
