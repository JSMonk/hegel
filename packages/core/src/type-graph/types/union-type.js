// @flow
import { Type } from "./type";
import { unique } from "../../utils/common";
import { getNameForType } from "../../utils/type-utils";
import { createTypeWithName } from "./create-type";
import type { Scope } from "../scope";
import type { TypeMeta } from "./type";

// $FlowIssue
export class UnionType extends Type {
  static _createTypeWithName = createTypeWithName(UnionType);

  static shouldBeUnion(variants: any) {
    return (
      variants.length !== 1 &&
      variants.slice(1).every(variant => variant.name !== variants[0].name)
    );
  }

  static createTypeWithName(name: string, typeScope: Scope, variants: any) {
    if (!this.shouldBeUnion(variants)) {
      return variants[0];
    }
    return this._createTypeWithName(name, typeScope, variants);
  }

  static getName(params: Array<Type>) {
    return `${unique(params, a => getNameForType(a))
      .sort((t1, t2) => getNameForType(t1).localeCompare(getNameForType(t2)))
      .reduce(
        (res, t) => `${res}${res ? " | " : ""}${getNameForType(t)}`,
        ""
      )}`;
  }

  variants: Array<Type>;

  constructor(name: string, variants: Array<Type>, meta?: TypeMeta = {}) {
    super(name, meta);
    this.variants = unique(variants, a => getNameForType(a)).sort((t1, t2) =>
      getNameForType(t1).localeCompare(getNameForType(t2))
    );
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
      UnionType.getName(newVariants),
      typeScope,
      newVariants
    );
  }

  equalsTo(anotherType: Type) {
    if (this.referenceEqualsTo(anotherType)) {
      return true;
    }
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
