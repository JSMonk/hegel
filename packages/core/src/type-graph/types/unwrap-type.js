import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { GenericType } from "./generic-type";

export class $AppliedUnwrap extends Type {
  static get name() {
    return "$AppliedUnwrap";
  }

  static term(
    name: ?string,
    meta?: TypeMeta = {},
    unwrap: Type,
    ...args: Array<any>
  ) {
    name = name || this.getName(unwrap);
    let parent: TypeScope | void = meta.parent;
    if (parent === undefined || unwrap.parent.priority > parent.priority) {
      parent = unwrap.parent;
    }
    const newMeta = { ...meta, parent };
    return super.term(name, newMeta, unwrap, ...args);
  }

  static getName(type) {
    return `$Unwrap<${String(type.name)}>`;
  }

  unwrap: Type;

  constructor(name, meta = {}, type) {
    name = name || this.getName(type);
    super(name, meta);
    this.unwrap = type;
  }

  equalsTo(type) {
    return type instanceof $AppliedUnwrap && this.unwrap.equalsTo(type.unwrap);
  }

  isSuperTypeFor(type) {
    return type instanceof $AppliedUnwrap
      ? this.unwrap.isSuperTypeFor(type.unwrap)
      : this.unwrap.isPrincipalTypeFor(type);
  }

  isPrincipalTypeFor(type: Type): boolean {
    return this.equalsTo(type) || this.isSuperTypeFor(type);
  }

  contains(type) {
    return this.unwrap.contains(type);
  }

  weakContains(type) {
    return this.unwrap.contains(type);
  }

  getDifference(type: Type, withReverseUnion?: boolean = false) {
    return this.unwrap.getDifference(type, withReverseUnion);
  }

  changeAll(...args) {
    const changed = this.unwrap.changeAll(...args);
    if (changed === this.unwrap) {
      return this;
    }
    return $AppliedUnwrap.term(null, {}, changed);
  }
}

export class $Unwrap extends GenericType {
  static get name() {
    return "$Unwrap";
  }

  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super("$Unwrap", meta, [TypeVar.term("target", { parent })], parent, null);
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
    return $AppliedUnwrap.term(null, { parent: target.parent }, target);
  }
}

