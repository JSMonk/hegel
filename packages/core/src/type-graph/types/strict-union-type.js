import { Type } from "./type";
import { TypeVar } from "./type-var";
import { UnionType } from "./union-type";
import { TypeScope } from "../type-scope";
import { GenericType } from "./generic-type";

export class $AppliedStrictUnion extends Type {
  static get name() {
    return "$AppliedStrictUnion";
  }

  static term(
    name: ?string,
    meta?: TypeMeta = {},
    oneOf: Type,
    ...args: Array<any>
  ) {
    name = name || this.getName(oneOf);
    let parent: TypeScope | void = meta.parent;
    if (parent === undefined || oneOf.parent.priority > parent.priority) {
      parent = oneOf.parent;
    }
    const newMeta = { ...meta, parent };
    return super.term(name, newMeta, oneOf, ...args);
  }

  static getName(type) {
    return `$StrictUnion<${String(type.name)}>`;
  }

  oneOf: Type | UnionType;

  get variants() {
    return this.oneOf instanceof UnionType ? this.oneOf.variants : [this.oneOf];
  }

  constructor(name, meta = {}, type) {
    name = name || this.getName(type);
    super(name, meta);
    this.oneOf = type;
  }

  equalsTo(type) {
    return (
      type instanceof $AppliedStrictUnion && this.oneOf.equalsTo(type.oneOf)
    );
  }

  isSuperTypeFor(type) {
    if (type instanceof $AppliedStrictUnion) {
      return this.oneOf.isSuperTypeFor(type.oneOf);
    }
    return this.variants.some((t) => t.isPrincipalTypeFor(type));
  }

  isPrincipalTypeFor(type) {
    type = this.getOponentType(type);
    return this.equalsTo(type) || this.isSuperTypeFor(type);
  }

  contains(type) {
    return this.oneOf.contains(type);
  }

  weakContains(type) {
    return this.oneOf.contains(type);
  }

  getDifference(type: Type, withReverseUnion?: boolean = false) {
    return this.oneOf.getDifference(type, withReverseUnion);
  }

  changeAll(...args) {
    const changed = this.oneOf.changeAll(...args);
    if (changed === this.oneOf) {
      return this;
    }
    return $AppliedStrictUnion.term(null, {}, changed);
  }

  getPropertyType(propertyName: mixed): ?Type {
    const propertyType = this.oneOf.getPropertyType(propertyName);
    if (propertyType === null || propertyType instanceof $AppliedStrictUnion) {
      return propertyType;
    }
    return $AppliedStrictUnion.term(null, {}, propertyType);
  }
}

export class $StrictUnion extends GenericType {
  static get name() {
    return "$StrictUnion";
  }

  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super(
      "$StrictUnion",
      meta,
      [TypeVar.term("target", { parent })],
      parent,
      null
    );
  }

  isPrincipalTypeFor() {
    return false;
  }

  equalsTo(type) {
    return false;
  }

  isSuperTypeFor() {
    return false;
  }

  applyGeneric(
    parameters,
    loc,
    shouldBeMemoize = true,
    isCalledAsBottom = false
  ) {
    super.assertParameters(parameters, loc);
    const [target] = parameters;
    return $AppliedStrictUnion.term(null, { parent: target.parent }, target);
  }
}
