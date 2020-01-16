// @flow
import { Type } from "./type";
import { unique } from "../../utils/common";
import { TypeVar } from "./type-var";
import type { TypeMeta } from "./type";
import type { TypeScope } from "../type-scope";

// $FlowIssue
export class UnionType extends Type {
  static term(
    name: mixed,
    meta?: TypeMeta = {},
    variants: Array<Type>,
    ...args: Array<any>
  ) {
    variants = UnionType.flatten(variants);
    const principalTypeInside = UnionType.getPrincipalTypeInside(variants);
    if (principalTypeInside !== undefined) {
      return principalTypeInside;
    }
    name = name == null ? UnionType.getName(variants) : name;
    let parent: TypeScope | void = meta.parent;
    const length = variants.length;
    for (let i = 0; i < length; i++) {
      const variant = variants[i];
      if (
        !TypeVar.isSelf(variant) &&
        (parent === undefined || parent.priority < variant.parent.priority)
      ) {
        parent = variant.parent;
      }
    }
    const newMeta = { ...meta, parent };
    return super.term(name, newMeta, variants, ...args);
  }

  static getPrincipalTypeInside(variants: any) {
    return variants.length === 1
      ? variants[0]
      : variants.find(
          variant =>
            !(variant instanceof TypeVar) &&
            variants.every(subVariant => variant.equalsTo(subVariant))
        );
  }

  static getName(params: Array<Type>) {
    return `${unique(params, a => String(a.name))
      .sort((t1, t2) => String(t1.name).localeCompare(String(t2.name)))
      .reduce((res, t) => {
        const isFunction =
          "argumentsTypes" in t ||
          // $FlowIssue
          ("subordinateType" in t && "argumentsTypes" in t.subordinateType);
        return `${res}${res ? " | " : ""}${isFunction ? "(" : ""}${String(
          t.name
        )}${isFunction ? ")" : ""}`;
      }, "")}`;
  }

  static flatten(variants: Array<Type>) {
    // $FlowIssue
    return variants.flatMap(
      variant =>
        variant instanceof UnionType
          ? this.flatten(variant.variants)
          : [variant]
    );
  }

  variants: Array<Type>;

  constructor(name: ?string, meta?: TypeMeta = {}, variants: Array<Type>) {
    variants = UnionType.flatten(variants);
    name = name == null ? UnionType.getName(variants) : name;
    super(name, meta);
    const principalTypeInside = UnionType.getPrincipalTypeInside(variants);
    if (principalTypeInside) {
      return principalTypeInside;
    }
    this.variants = unique(variants, a => String(a.name)).sort((t1, t2) =>
      String(t1.name).localeCompare(String(t2.name))
    );
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: TypeScope
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
    return UnionType.term(null, {}, newVariants);
  }

  equalsTo(anotherType: Type) {
    anotherType = this.getOponentType(anotherType);
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
    anotherType = this.getOponentType(anotherType);
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

  getPropertyType(propertyName: mixed): ?Type {
    return null;
  }

  contains(type: Type) {
    return super.contains(type) || this.variants.some(v => v.contains(type));
  }

  getDifference(type: Type) {
    if (type instanceof UnionType) {
      // $FlowIssue
      return this.variants
        .flatMap(
          variant =>
            // $FlowIssue
            type.variants.flatMap(a => variant.getDifference(a))
        );
    }
    return super.getDifference(type);
  }

  weakContains(type: Type) {
    return (
      super.contains(type) || this.variants.some(v => v.weakContains(type))
    );
  }

  generalize(types: Array<TypeVar>, typeScope: TypeScope) {
    const variants = this.variants.map(v => v.generalize(types, typeScope));
    if (this.variants.every((v, i) => v === variants[i])) {
      return this;
    }
    return UnionType.term(null, {}, variants);
  }

  containsAsGeneric(type: Type) {
    return this.variants.some(v => v.containsAsGeneric(type));
  }
}
