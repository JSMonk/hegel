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
export const POSITIONS = "[[Positions]]";
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
  ...args: Array<any>
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
    return this.name === anotherType.name;
  }

  isSuperTypeFor(type: Type): boolean {
    return type.isLiteralOf === this;
  }

  isPrincipalTypeFor(type: Type): boolean {
    return (
      this.equalsTo(new Type("mixed")) ||
      this.equalsTo(type) ||
      this.isSuperTypeFor(type)
    );
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

  properties: Map<string | number, VariableInfo>;

  constructor(
    name: string,
    properties: Array<[string | number, VariableInfo]>
  ) {
    super(name, { isLiteralOf: new Type("Object") });
    this.properties = new Map(properties);
  }

  hasProperty(propertyName: any) {
    return this.properties.has(propertyName);
  }

  getPropertyType(propertyName: any) {
    if (!this.hasProperty(propertyName)) {
      throw new Error("Unknow property");
    }
    return this.properties.get(propertyName);
  }

  isAllProperties(
    predicate: "equalsTo" | "isPrincipalTypeFor",
    anotherType: ObjectType
  ): boolean {
    for (const [key, { type }] of this.properties) {
      const anotherProperty = anotherType.properties.get(key) || {
        type: new Type("void")
      };
      /* $FlowIssue - flow doesn't type methods by name */
      if (!type[predicate](anotherProperty.type)) {
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
    const newProperties: Array<[string | number, VariableInfo]> = [];
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
    const requiredProperties = [...this.properties.values()].filter(
      ({ type }) =>
        !(type instanceof UnionType) ||
        !type.variants.some(t => t.equalsTo(new Type("void")))
    );
    return (
      anotherType instanceof ObjectType &&
      anotherType.properties.size >= requiredProperties.length &&
      this.isAllProperties("isPrincipalTypeFor", anotherType)
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

  assertParameters(parameters: Array<Type>, loc?: SourceLocation) {
    if (parameters.length !== this.genericArguments.length) {
      throw new HegelError(
        `Generic '${String(
          this.name
        )}' called with wrong number of arguments. Expect: ${
          this.genericArguments.length
        }, Actual: ${parameters.length}`,
        loc
      );
    }
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
  ): Type {
    return this.subordinateType.changeAll(sourceTypes, targetTypes, typeScope);
  }

  applyGeneric(
    parameters: Array<Type>,
    loc?: SourceLocation,
    shouldBeMemoize?: boolean = true
  ): T {
    this.assertParameters(parameters, loc);
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
      this.returnType.isPrincipalTypeFor(anotherType.returnType) &&
      this.argumentsTypes.every((type, index) =>
        (argumentsTypes[index] || new Type("void")).isPrincipalTypeFor(type)
      )
    );
  }
}

// $FlowIssue
export class UnionType extends Type {
  static _createTypeWithName = createTypeWithName(UnionType);

  static createTypeWithName(name: string, typeScope: Scope, variants: any) {
    if (variants.every(variant => variant.name === variants[0].name)) {
      return variants[0];
    }
    return this._createTypeWithName(name, typeScope, variants);
  }

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
        if (!this.variants.some(type => type.isPrincipalTypeFor(variantType))) {
          return false;
        }
      }
      return true;
    }
    return this.variants.some(type => type.isPrincipalTypeFor(anotherType));
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
      anotherType instanceof TupleType &&
      //$FlowIssue - instanceof type refinement
      this.items.every((t, i) => anotherType.items[i].isPrincipalTypeFor(t))
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

  hasProperty(property: mixed) {
    return typeof property === typeof this.keyType;
  }

  getPropertyType(propertyName: mixed) {
    if (!this.hasProperty(propertyName)) {
      throw new Error("Unknow property");
    }
    return this.valueType;
  }

  equalsTo(anotherType: Type) {
    return (
      anotherType instanceof CollectionType &&
      super.equalsTo(anotherType) &&
      this.keyType.equalsTo(anotherType.keyType) &&
      this.valueType.equalsTo(anotherType.valueType)
    );
  }

  isSuperTypeFor(anotherType: any) {
    return (
      (anotherType instanceof CollectionType &&
        this.keyType.equalsTo(anotherType.keyType) &&
        this.valueType.isPrincipalTypeFor(anotherType.valueType)) ||
      (anotherType instanceof TupleType &&
        this.keyType.equalsTo(new Type("number")) &&
        anotherType.items.every(t => this.valueType.isPrincipalTypeFor(t)))
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
  throwable: ?Array<VariableInfo | Type>;
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
  throwable: ?Type;
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
