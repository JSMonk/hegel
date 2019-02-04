// @flow
import HegelError from "../utils/errors";
import {
  getNameForType,
  findVariableInfo,
  getUnionTypeLiteral,
  getTupleTypeLiteral,
  getObjectTypeLiteral,
  getFunctionTypeLiteral,
  getCollectionTypeLiteral,
  getTypeFromTypeAnnotation
} from "../utils/utils";
import type {
  SourceLocation,
  TypeAnnotation,
  TypeParameter
} from "@babel/parser";

export const UNDEFINED_TYPE = "?";
export const TYPE_SCOPE = "[[TypeScope]]";

export type GraphElement = Scope | VariableInfo;

export type TypeGraph = Map<string, GraphElement>;

export const ZeroLocation: SourceLocation = {
  start: { column: -1, line: -1 },
  end: { column: -1, line: -1 }
};

export class Meta {
  loc: SourceLocation;

  constructor(loc: SourceLocation) {
    this.loc = loc;
  }
}

export type CallableTarget = {
  type: FunctionType | GenericType<FunctionType>
};

export type CallableArguments = Type | VariableInfo;

export class CallMeta extends Meta {
  target: CallableTarget;
  targetName: string;
  arguments: Array<CallableArguments>;

  constructor(
    target: CallableTarget,
    args: Array<CallableArguments>,
    loc: SourceLocation,
    targetName: string
  ) {
    super(loc);
    this.target = target;
    this.targetName = targetName;
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
  isLiteralOf?: Type
};

const createTypeWithName = <T: Type>(BaseType: Class<T>) => (
  name: string,
  typeScope: Scope | ModuleScope,
  ...args
): T => {
  if (name === UNDEFINED_TYPE) {
    return new BaseType(name, ...args);
  }
  let existedType;
  try {
    existedType = findVariableInfo({ name }, typeScope);
  } catch {}
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
  isLiteralOf: ?Type;

  constructor(name: mixed, meta?: TypeMeta = {}) {
    const { isLiteralOf = null } = meta;
    this.name = name;
    this.isLiteralOf = isLiteralOf;
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
  ) {
    const indexOfNewType = sourceTypes.indexOf(this);
    return indexOfNewType === -1 ? this : targetTypes[indexOfNewType];
  }

  equalsTo(anotherType: Type) {
    return (
      this.name === anotherType.name &&
      this.isLiteralOf === anotherType.isLiteralOf
    );
  }

  isSuperTypeFor(type: Type): boolean {
    return type.isLiteralOf === this;
  }

  isPrincipalTypeFor(type: Type): boolean {
    return this.equalsTo(type) || this.isSuperTypeFor(type);
  }
}

export class TypeVar extends Type {
  static createTypeWithName = createTypeWithName(TypeVar);

  constraint: ?Type;
  root: ?Type;
  isUserDefined: ?boolean;

  constructor(
    name: string,
    constraint: ?Type,
    isUserDefined?: boolean = false
  ) {
    super(name);
    this.name = name;
    this.constraint = constraint;
    this.isUserDefined = isUserDefined;
  }

  equalsTo(anotherType: Type) {
    if (!this.constraint) {
      return true;
    }
    return this.constraint.isSuperTypeFor(anotherType);
  }

  isSuperTypeFor(type: Type): boolean {
    return this.equalsTo(type);
  }
}

export class ObjectType extends Type {
  static createTypeWithName = createTypeWithName(ObjectType);

  properties: Map<string, VariableInfo>;

  constructor(name: string, properties: Array<[string, VariableInfo]>) {
    super(name);
    this.properties = new Map(properties);
  }

  isAllProperties(
    predicate: "equalsTo" | "isSuperTypeFor",
    anotherType: ObjectType
  ): boolean {
    for (const [key, { type }] of this.properties) {
      const anotherPropertyType = anotherType.properties.get(key);
      /* $FlowIssue - flow doesn't type methods by name */
      if (!anotherPropertyType || !type[predicate](anotherPropertyType.type)) {
        return false;
      }
    }
    return true;
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
  ): Type {
    let isAnyPropertyChanged = false;
    const newProperties: Array<[string, VariableInfo]> = [];
    this.properties.forEach((vInfo, key) => {
      const newType = vInfo.type.changeAll(sourceTypes, targetTypes, typeScope);
      if (vInfo.type === newType) {
        return newProperties.push([key, vInfo]);
      }
      isAnyPropertyChanged = true;
      newProperties.push([
        key,
        new VariableInfo(newType, vInfo.parent, vInfo.meta)
      ]);
    });
    if (!isAnyPropertyChanged) {
      return this;
    }
    return ObjectType.createTypeWithName(
      getObjectTypeLiteral(newProperties),
      typeScope,
      /* $FlowIssue - Couldn't inferece ObjectType */
      newProperties
    );
  }

  equalsTo(anotherType: Type) {
    if (
      !(anotherType instanceof ObjectType) ||
      anotherType.properties.size !== this.properties.size ||
      !super.equalsTo(anotherType)
    ) {
      return false;
    }
    return this.isAllProperties("equalsTo", anotherType);
  }

  isSuperTypeFor(anotherType: Type): boolean {
    return (
      anotherType instanceof ObjectType &&
      anotherType.properties.size >= this.properties.size &&
      this.isAllProperties("isSuperTypeFor", anotherType)
    );
  }
}

export class GenericType<T: Type> extends Type {
  static createTypeWithName = createTypeWithName(GenericType);

  genericArguments: Array<Type>;
  subordinateType: T;
  localTypeScope: Scope;

  constructor(
    name: string,
    genericArguments: Array<TypeParameter | TypeVar>,
    typeScope: Scope,
    type: T
  ) {
    super(name);
    this.subordinateType = type;
    this.localTypeScope = typeScope;
    this.genericArguments = genericArguments;
  }

  isSuperTypeFor(anotherType: Type) {
    return this.subordinateType.isSuperTypeFor(anotherType);
  }

  applyGeneric(
    parameters: Array<Type>,
    loc?: SourceLocation,
    shouldBeMemoize?: boolean = true
  ): T {
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
    const existedType = this.localTypeScope.parent.body.get(appliedTypeName);
    if (existedType && existedType instanceof VariableInfo) {
      return (existedType.type: any);
    }
    if (this.localTypeScope.parent instanceof ModuleScope) {
      throw new Error("Never!");
    }
    const result = this.subordinateType.changeAll(
      this.genericArguments,
      parameters,
      this.localTypeScope.parent
    );
    if (shouldBeMemoize) {
      this.localTypeScope.parent.body.set(
        appliedTypeName,
        /*::(*/ this.localTypeScope.parent.body.get(
          getNameForType(result)
        ) /*:: :any)*/
      );
    }
    return result;
  }
}

export class FunctionType extends Type {
  static createTypeWithName = createTypeWithName(FunctionType);

  argumentsTypes: Array<Type>;
  returnType: Type;

  constructor(name: string, argumentsTypes: Array<Type>, returnType: Type) {
    super(name);
    this.argumentsTypes = argumentsTypes;
    this.returnType = returnType;
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
  ): Type {
    let isArgumentsChanged = false;
    const newArguments = this.argumentsTypes.map(t => {
      const newT = t.changeAll(sourceTypes, targetTypes, typeScope);
      if (newT === t) {
        return t;
      }
      isArgumentsChanged = true;
      return newT;
    });
    const newReturn = this.returnType.changeAll(
      sourceTypes,
      targetTypes,
      typeScope
    );
    if (newReturn === this.returnType && !isArgumentsChanged) {
      return this;
    }
    return FunctionType.createTypeWithName(
      getFunctionTypeLiteral(newArguments, newReturn),
      typeScope,
      newArguments,
      newReturn
    );
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

  isSuperTypeFor(anotherType: Type): boolean {
    const argumentsTypes =
      anotherType instanceof FunctionType ? anotherType.argumentsTypes : [];
    return (
      anotherType instanceof FunctionType &&
      this.returnType.isSuperTypeFor(anotherType.returnType) &&
      this.argumentsTypes.every((type, index) =>
        argumentsTypes[index].isSuperTypeFor(type)
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

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
  ) {
    let isVariantsChanged = false;
    const newVariants = this.variants.map(t => {
      const newT = t.changeAll(sourceTypes, targetTypes, typeScope);
      if (newT === t) {
        return t;
      }
      isVariantsChanged = true;
      return newT;
    });
    if (!isVariantsChanged) {
      return this;
    }
    return UnionType.createTypeWithName(
      getUnionTypeLiteral(newVariants),
      typeScope,
      newVariants
    );
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

  isSuperTypeFor(anotherType: Type): boolean {
    if (anotherType instanceof UnionType) {
      if (anotherType.variants.length > this.variants.length) {
        return false;
      }
      for (const variantType of anotherType.variants) {
        if (!this.variants.some(type => type.isSuperTypeFor(variantType))) {
          return false;
        }
      }
      return true;
    }
    return this.variants.some(type => type.isSuperTypeFor(anotherType));
  }
}

export class TupleType extends Type {
  static createTypeWithName = createTypeWithName(TupleType);

  items: Array<Type>;

  constructor(name: string, items: Array<Type>) {
    super(name);
    this.items = items;
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
  ) {
    let isItemsChanged = false;
    const newItems = this.items.map(t => {
      const newT = t.changeAll(sourceTypes, targetTypes, typeScope);
      if (newT === t) {
        return t;
      }
      isItemsChanged = true;
      return newT;
    });
    if (!isItemsChanged) {
      return this;
    }
    return TupleType.createTypeWithName(
      getTupleTypeLiteral(newItems),
      typeScope,
      newItems
    );
  }

  isSuperTypeFor(anotherType: Type) {
    return (
      anotherType instanceof CollectionType &&
      anotherType.keyType.equalsTo(new Type("number")) &&
      (this.items.length === 0 ||
        (this.items.length === 1 &&
          this.items[0].isSuperTypeFor(anotherType.valueType)) ||
        (this.items.length > 1 &&
          anotherType.valueType instanceof UnionType &&
          // $FlowIssue
          this.items.every(t => anotherType.valueType.isSuperTypeFor(t))))
    );
  }

  equalsTo(anotherType: Type) {
    const anotherVariants =
      anotherType instanceof TupleType ? anotherType.items : [];
    return (
      anotherType instanceof TupleType &&
      super.equalsTo(anotherType) &&
      this.items.length === anotherVariants.length &&
      this.items.every((type, index) => type.equalsTo(anotherVariants[index]))
    );
  }
}

export class CollectionType<K: Type, V: Type> extends Type {
  static createTypeWithName = createTypeWithName(CollectionType);

  keyType: K;
  valueType: V;

  constructor(name: string, keyType: K, valueType: V) {
    super(name);
    this.keyType = keyType;
    this.valueType = valueType;
  }

  equalsTo(anotherType: Type) {
    return (
      anotherType instanceof CollectionType &&
      super.equalsTo(anotherType) &&
      this.keyType.equalsTo(anotherType.keyType) &&
      this.valueType.equalsTo(anotherType.valueType)
    );
  }

  isSuperTypeFor(anotherType: Type) {
    return (
      anotherType instanceof CollectionType &&
      this.keyType.equalsTo(anotherType.keyType) &&
      this.valueType.isSuperTypeFor(anotherType.valueType)
    );
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
  ) {
    const newValueType = this.valueType.changeAll(
      sourceTypes,
      targetTypes,
      typeScope
    );
    if (newValueType === this.valueType) {
      return this;
    }
    return CollectionType.createTypeWithName(
      getCollectionTypeLiteral(this.keyType, newValueType),
      typeScope,
      this.keyType,
      newValueType
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

  constructor(
    type: Type,
    parent: ?Scope | ?ModuleScope,
    meta?: Meta = new Meta(ZeroLocation)
  ) {
    this.type = type;
    this.parent = parent;
    this.meta = meta;
  }
}
