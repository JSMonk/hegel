// @flow
import { createTypeWithName } from "./create-type";
import type { Scope } from "../scope";
import type { TypeVar } from "./type-var";

export type TypeMeta = {
  isSubtypeOf?: ?Type
};

export class Type {
  static createTypeWithName = createTypeWithName(Type);

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
  isSubtypeOf: ?Type;

  constructor(name: mixed, meta?: TypeMeta = {}) {
    const { isSubtypeOf = null } = meta;
    this.name = name;
    this.isSubtypeOf = isSubtypeOf;
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
    typeScope: Scope
  ) {
    const indexOfNewType = sourceTypes.indexOf(this);
    return indexOfNewType === -1 ? this : targetTypes[indexOfNewType];
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
      this.equalsTo(new Type("unknown")) ||
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

  generalize(types: Array<TypeVar>, typeScope: Scope) {
    return this;
  }

  containsAsGeneric(type: Type) {
    return false;
  }
}
