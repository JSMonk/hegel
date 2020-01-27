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
        variant instanceof Type &&
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
    return `${unique(params.map(Type.getTypeRoot), a => String(a.name))
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
    if (sourceTypes.every(type => !this.canContain(type))) {
      return this;
    }
    if (this._alreadyProcessedWith !== null) {
      return this._alreadyProcessedWith;
    }
    this._alreadyProcessedWith = TypeVar.createSelf(
      this.getChangedName(sourceTypes, targetTypes),
      this.parent
    );
    try {
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
        this._alreadyProcessedWith = null;
        return this;
      }
      return this.endChanges(UnionType.term(null, {}, newVariants));
    } catch (e) {
      this._alreadyProcessedWith = null;
      throw e;
    }
  }

  equalsTo(anotherType: Type) {
    anotherType = this.getOponentType(anotherType);
    if (this.referenceEqualsTo(anotherType)) {
      return true;
    }
    if (this._alreadyProcessedWith === anotherType) {
      return true;
    }
    this._alreadyProcessedWith = anotherType;
    const anotherVariants =
      anotherType instanceof UnionType ? anotherType.variants : [];
    const result =
      anotherType instanceof UnionType &&
      super.equalsTo(anotherType) &&
      this.canContain(anotherType) &&
      this.variants.length === anotherVariants.length &&
      this.variants.every((type, index) =>
        type.equalsTo(anotherVariants[index])
      );
    this._alreadyProcessedWith = null;
    return result;
  }

  isSuperTypeFor(anotherType: Type): boolean {
    anotherType = this.getOponentType(anotherType);
    if (this._alreadyProcessedWith === anotherType) {
      return true;
    }
    this._alreadyProcessedWith = anotherType;
    if (anotherType instanceof UnionType) {
      for (const variantType of anotherType.variants) {
        if (!this.variants.some(type => type.isPrincipalTypeFor(variantType))) {
          this._alreadyProcessedWith = null;
          return false;
        }
      }
      this._alreadyProcessedWith = null;
      return true;
    }
    const result = this.variants.some(type =>
      type.isPrincipalTypeFor(anotherType)
    );
    this._alreadyProcessedWith = null;
    return result;
  }

  getPropertyType(propertyName: mixed): ?Type {
    return null;
  }

  contains(type: Type) {
    if (this._alreadyProcessedWith === type || !this.canContain(type)) {
      return false;
    }
    this._alreadyProcessedWith = type;
    const result =
      super.contains(type) || this.variants.some(v => v.contains(type));
    this._alreadyProcessedWith = null;
    return result;
  }

  getDifference(type: Type) {
    if (this._alreadyProcessedWith === type) {
      return [];
    }
    this._alreadyProcessedWith = type;
    if (type instanceof UnionType) {
      // $FlowIssue
      const diff = this.variants.flatMap(variant =>
        variant.getDifference(type)
      );
      const reducer = new Map();
      for (const { root, variable } of diff) {
        const existed = reducer.get(variable) || [];
        existed.push(root);
        reducer.set(variable, existed);
      }
      const aggregatedDiff = [];
      for (const [variable, variants] of reducer) {
        aggregatedDiff.push({
          variable,
          root:
            variants.length === 1
              ? variants[0]
              : UnionType.term(null, {}, variants)
        });
      }
      this._alreadyProcessedWith = null;
      return aggregatedDiff;
    }
    const result = super.getDifference(type);
    this._alreadyProcessedWith = null;
    return result;
  }

  weakContains(type: Type) {
    if (this._alreadyProcessedWith === type || !this.canContain(type)) {
      return false;
    }
    this._alreadyProcessedWith = type;
    const result =
      super.contains(type) || this.variants.some(v => v.weakContains(type));
    this._alreadyProcessedWith = null;
    return result;
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
