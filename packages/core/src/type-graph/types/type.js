// @flow
import HegelError from "../../utils/errors";
import type { TypeVar } from "./type-var";
import type { TypeScope } from "../type-scope";
import type { SourceLocation } from "@babel/parser";

export type TypeMeta = {
  loc?: SourceLocation,
  parent?: TypeScope,
  isSubtypeOf?: Type | null,
  shouldBeUsedAsGeneric?: boolean
};

export class Type {
  static GlobalTypeScope: TypeScope;
  static Undefined = new Type("undefined");
  static Null = new Type(null);
  static String = new Type("string");
  static Symbol = new Type("symbol");
  static Boolean = new Type("boolean");
  static Number = new Type("number");
  static BigInt = new Type("bigint");
  static Unknown = new Type("unknown");
  static Never = new Type("never");

  static find(name: mixed, meta?: TypeMeta = {}, ...args: Array<any>) {
    const scope = meta.parent || Type.GlobalTypeScope;
    // $FlowIssue
    const existed = scope.findTypeWithName(name, ...args);
    if (existed === undefined) {
      throw new HegelError(`Type "${String(name)}" are not existed`, meta.loc);
    }
    return existed;
  }

  static new(name: mixed, meta?: TypeMeta = {}, ...args: Array<any>) {
    const scope = meta.parent || Type.GlobalTypeScope;
    const newType = new this(name, meta, ...args);
    scope.body.set(name, newType);
    return newType;
  }

  static term(name: mixed, meta?: TypeMeta = {}, ...args: Array<any>) {
    const scope = meta.parent || Type.GlobalTypeScope;
    const existed = scope.findTypeWithName(name);
    if (this.shouldBeReplaced(existed, name, meta, ...args)) {
      return this.new(name, meta, ...args);
    }
    return existed;
  }

  static shouldBeReplaced(
    type?: Type,
    name: mixed,
    meta: TypeMeta,
    ...args: Array<any>
  ) {
    return type === undefined || !(type instanceof this);
  }

  static getTypeRoot(type: Type) {
    // $FlowIssue
    if (!("root" in type) || type.root == undefined) {
      return type;
    }
    let potentialRoot = type.root;
    while ("root" in potentialRoot && potentialRoot.root != undefined) {
      // $FlowIssue
      potentialRoot = potentialRoot.root;
    }
    return potentialRoot;
  }

  name: mixed;
  parent: TypeScope;
  shouldBeUsedAsGeneric: boolean;
  isSubtypeOf: Type | null;

  constructor(name: mixed, meta: TypeMeta = {}) {
    const {
      parent = Type.GlobalTypeScope,
      isSubtypeOf = null,
      shouldBeUsedAsGeneric = false
    } = meta;
    this.name = name;
    this.isSubtypeOf = isSubtypeOf;
    this.parent = parent;
    this.shouldBeUsedAsGeneric = shouldBeUsedAsGeneric;
  }

  getChangedName(sourceTypes: Array<Type>, targetTypes: Array<Type>) {
    return String(this.name).replace(
      /<(.+?)>/g,
      (_, typesList) =>
        `<${typesList
          .split(", ")
          .map(name => {
            const index = sourceTypes.findIndex(a => a.name === name);
            return index === -1 ? name : targetTypes[index].name;
          })
          .filter(Boolean)
          .join(", ")}>`
    );
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: TypeScope
  ) {
    const indexOfNewType = sourceTypes.indexOf(this);
    return indexOfNewType === -1 ? this : targetTypes[indexOfNewType];
  }

  save() {
    if (!this.parent.body.has(this.name)) {
      this.parent.body.set(this.name, this);
    }
    return this;
  }

  referenceEqualsTo(anotherType: Type) {
    return this === anotherType;
  }

  equalsTo(anotherType: Type) {
    return (
      this.referenceEqualsTo(anotherType) || this.name === anotherType.name
    );
  }

  isSuperTypeFor(type: Type): boolean {
    if (!type.isSubtypeOf) {
      return false;
    }
    return this.isPrincipalTypeFor(type.isSubtypeOf);
  }

  getPropertyType(propertyName: mixed): ?Type {
    if (this.isSubtypeOf != null) {
      return this.isSubtypeOf.getPropertyType(propertyName);
    }
    return null;
  }

  isPrincipalTypeFor(type: Type): boolean {
    return (
      this.equalsTo(Type.Unknown) ||
      this.equalsTo(type) ||
      this.isSuperTypeFor(type)
    );
  }

  getDifference(type: Type) {
    if ("variants" in type) {
      // $FlowIssue
      return type.variants.flatMap(a => this.getDifference(a));
    }
    if ("root" in type) {
      return [{ root: this, variable: type }];
    }
    return [];
  }

  contains(type: Type) {
    return this === type;
  }

  weakContains(type: Type) {
    return this.contains(type);
  }

  getOponentType(type: Type, withUnpack?: boolean = true) {
    if ("root" in type) {
      type = Type.getTypeRoot(type);
    }
    if ("unpack" in type) {
      // $FlowIssue
      type = withUnpack ? type.unpack() : type.subordinateMagicType;
    }
    if ("root" in type) {
      type = Type.getTypeRoot(type);
    }
    if ("subordinateType" in type) {
      // $FlowIssue
      type = type.subordinateType;
    }
    if ("root" in type) {
      type = Type.getTypeRoot(type);
    }
    return type;
  }

  makeNominal() {}

  setInitialized(propertyName: mixed) {}

  generalize(types: Array<TypeVar>, typeScope: TypeScope) {
    return this;
  }

  containsAsGeneric(type: Type) {
    return false;
  }
}
