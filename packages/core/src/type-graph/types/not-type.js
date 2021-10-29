import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { GenericType } from "./generic-type";

export class $AppliedNot extends Type {
  static get name() {
    return "$AppliedNot";
  }

  static term(
    name: ?string,
    meta?: TypeMeta = {},
    not: Type,
    ...args: Array<any>
  ) {
    name = name || this.getName(not);
    let parent: TypeScope | void = meta.parent;
    if (parent === undefined || not.parent.priority > parent.priority) {
      parent = not.parent;
    }
    const newMeta = { ...meta, parent };
    return super.term(name, newMeta, not, ...args);
  }

  static getName(type) {
    return `$Not<${String(type.name)}>`;
  }

  not: Type;

  constructor(name, meta = {}, type) {
    name = name || this.getName(type);
    super(name, meta);
    this.not = type;
  }

  equalsTo(type) {
    return type instanceof $AppliedNot && this.not.equalsTo(type.not);
  }

  isSuperTypeFor(type) {
    return type instanceof $AppliedNot
      ? this.not.isSuperTypeFor(type.not)
      : !this.not.isPrincipalTypeFor(type);
  }

  isPrincipalTypeFor(type: Type): boolean {
    return this.equalsTo(type) || this.isSuperTypeFor(type);
  }

  contains(type) {
    return this.not.contains(type);
  }

  weakContains(type) {
    return this.not.contains(type);
  }

  getDifference(type: Type, withReverseUnion?: boolean = false) {
    return this.not.getDifference(type, withReverseUnion);
  }

  changeAll(...args) {
    const changed = this.not.changeAll(...args);
    if (changed === this.not) {
      return this;
    }
    return $AppliedNot.term(null, {}, changed);
  }
}

export class $Not extends GenericType {
  static get name() {
    return "$Not";
  }

  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super("$Not", meta, [TypeVar.term("target", { parent })], parent, null);
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
    return $AppliedNot.term(null, { parent: target.parent }, target);
  }
}
