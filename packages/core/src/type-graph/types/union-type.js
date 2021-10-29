// @flow
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { ObjectType } from "./object-type";
import type { TypeMeta } from "./type";
import type { TypeScope } from "../type-scope";
import type { $BottomType } from "./bottom-type";

export class UnionType extends Type {
  static Boolean = new UnionType("boolean", {}, [Type.True, Type.False]);

  static get name() {
    return "UnionType";
  }

  static term(
    name: mixed,
    meta?: TypeMeta = {},
    variants: Array<Type>,
    ...args: Array<any>
  ) {
    variants = UnionType.flatten(variants);
    variants = UnionType.rollup(variants);
    if (variants.length === 1) {
      return variants[0];
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

  static getName(params: Array<Type>) {
    const isMultyLine = this.prettyMode && params.length >= 4;
    const isBooleanExist =
      params.some((p) => p === Type.True) &&
      params.some((p) => p === Type.False);
    if (isBooleanExist) {
      params = params
        .filter((p) => p !== Type.True && p !== Type.False)
        .concat(UnionType.Boolean);
    }
    return `${params
      .sort((t1, t2) => String(t1.name).localeCompare(String(t2.name)))
      .reduce((res, t) => {
        const isFunction =
          "argumentsTypes" in t ||
          // $FlowIssue
          ("subordinateType" in t && "argumentsTypes" in t.subordinateType);
        let typeName = String(t.name);
        if (isFunction) {
          typeName = `(${typeName})`;
        }
        return isMultyLine
          ? this.multyLine(res, typeName)
          : this.oneLine(res, typeName);
      }, "")}`;
  }

  static oneLine(res: string, typeName: string) {
    return `${res}${res ? " | " : ""}${typeName}`;
  }

  static multyLine(res: string, typeName: string) {
    return `${res}${res ? "\n| " : "  "}${typeName}`;
  }

  static flatten(variants: Array<Type>) {
    // $FlowIssue
    return variants.flatMap((variant) =>
      variant instanceof UnionType
        ? this.flatten(variant.variants)
        : [Type.getTypeRoot(variant)]
    );
  }

  static shouldBeSkipped(variant: $BottomType | Type) {
    return (
      "subordinateMagicType" in variant ||
      variant instanceof TypeVar ||
      variant instanceof ObjectType ||
      variant === Type.Unknown
    );
  }

  static uniqueVariants(set: Array<Type>) {
    let unique: Array<Type> = [];
    for (let i = 0; i < set.length; i++) {
      const currentType = set[i];
      if (unique.includes(currentType)) {
        continue;
      }
      if (this.shouldBeSkipped(currentType)) {
        unique.push(currentType);
        continue;
      }
      if (
        !unique.some(
          (existed) =>
            !this.shouldBeSkipped(existed) &&
            existed.isPrincipalTypeFor(currentType)
        )
      ) {
        unique = [
          ...unique.filter(
            (t) => this.shouldBeSkipped(t) || !currentType.isPrincipalTypeFor(t)
          ),
          currentType,
        ];
      }
    }
    return unique;
  }

  static rollup(variants: any) {
    return variants.length === 1
      ? [variants[0]]
      : this.uniqueVariants(variants);
  }

  variants: Array<Type>;

  constructor(name: ?string, meta?: TypeMeta = {}, variants: Array<Type>) {
    variants = UnionType.flatten(variants);
    variants = UnionType.rollup(variants);
    if (variants.length === 1) {
      return variants[0];
    }
    name = name == null ? UnionType.getName(variants) : name;
    super(name, meta);
    this.variants = variants.sort((t1, t2) =>
      String(t1.name).localeCompare(String(t2.name))
    );
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: TypeScope
  ) {
    if (sourceTypes.every((type) => !this.canContain(type))) {
      return this;
    }
    const currentSelf = TypeVar.createSelf(
      this.getChangedName(sourceTypes, targetTypes),
      this.parent
    );
    if (
      this._changeStack !== null &&
      this._changeStack.find((a) => a.equalsTo(currentSelf))
    ) {
      return currentSelf;
    }
    this._changeStack =
      this._changeStack === null
        ? [currentSelf]
        : [...this._changeStack, currentSelf];
    try {
      let isVariantsChanged = false;
      const newVariants = this.variants.map((t) => {
        const newT = t.changeAll(sourceTypes, targetTypes, typeScope);
        if (newT === t) {
          return t;
        }
        isVariantsChanged = true;
        return newT;
      });
      return this.endChanges(
        !isVariantsChanged ? this : UnionType.term(null, {}, newVariants)
      );
    } catch (e) {
      this._changeStack = null;
      throw e;
    }
  }

  equalsTo(anotherType: Type) {
    anotherType = this.getOponentType(anotherType);
    if (
      this.referenceEqualsTo(anotherType) ||
      this._alreadyProcessedWith === anotherType
    ) {
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
        if (
          !this.variants.some((type) => type.isPrincipalTypeFor(variantType))
        ) {
          this._alreadyProcessedWith = null;
          return false;
        }
      }
      this._alreadyProcessedWith = null;
      return true;
    }
    const result = this.variants.some((type) =>
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
      super.contains(type) || this.variants.some((v) => v.contains(type));
    this._alreadyProcessedWith = null;
    return result;
  }

  getDifference(type: Type, withReverseUnion?: boolean = false) {
    if (this._alreadyProcessedWith === type || this.referenceEqualsTo(type)) {
      return [];
    }
    this._alreadyProcessedWith = type;
    if (type instanceof UnionType || withReverseUnion) {
      // $FlowIssue
      const diff = this.variants.flatMap((variant) =>
        variant.getDifference(type, withReverseUnion)
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
              : UnionType.term(null, {}, variants),
        });
      }
      this._alreadyProcessedWith = null;
      return aggregatedDiff;
    }
    const result = super.getDifference(type, withReverseUnion);
    this._alreadyProcessedWith = null;
    return result;
  }

  weakContains(type: Type) {
    if (this._alreadyProcessedWith === type || !this.canContain(type)) {
      return false;
    }
    this._alreadyProcessedWith = type;
    const result =
      super.contains(type) || this.variants.some((v) => v.weakContains(type));
    this._alreadyProcessedWith = null;
    return result;
  }

  generalize(types: Array<TypeVar>, typeScope: TypeScope) {
    const variants = this.variants.map((v) => v.generalize(types, typeScope));
    if (this.variants.every((v, i) => v === variants[i])) {
      return this;
    }
    return UnionType.term(null, {}, variants);
  }

  containsAsGeneric(type: Type) {
    return this.variants.some((v) => v.containsAsGeneric(type));
  }

  getNextParent(typeScope: TypeScope) {
    if (this._alreadyProcessedWith !== null) {
      return Type.GlobalTypeScope;
    }
    this._alreadyProcessedWith = this;
    const sortedParents = [...this.variants]
      .map((a) => a.getNextParent(typeScope))
      .sort((a, b) => b.priority - a.priority);
    for (const parent of sortedParents) {
      if (parent.priority <= typeScope.priority && parent !== typeScope) {
        this._alreadyProcessedWith = null;
        return parent;
      }
    }
    this._alreadyProcessedWith = null;
    return Type.GlobalTypeScope;
  }
}

// $FlowIssue We need it to have access to Boolean type inside src/type-graph/types/type.js otherwise - circular dependency
Type.Boolean = UnionType.Boolean;
