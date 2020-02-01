import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { GenericType } from "./generic-type";

export class $AppliedImmutable extends Type {
  static term(
    name: ?string,
    meta?: TypeMeta = {},
    readonly: Type,
    ...args: Array<any>
  ) {
    name = name || this.getName(readonly);
    let parent: TypeScope | void = meta.parent;
    if (parent === undefined || readonly.parent.priority > parent.priority) {
      parent = readonly.parent;
    }
    const newMeta = { ...meta, parent };
    return super.term(name, newMeta, readonly, ...args);
  }

  static getName(type) {
    return `$Immutable<${String(type.name)}>`;
  }

  readonly: Type;

  constructor(name, meta = {}, type) {
    name = name || this.getName(readonly);
    super(name, meta);
    this.readonly = type;
  }

  equalsTo(type) {
    return type instanceof $AppliedImmutable && this.readonly.equalsTo(type.readonly);
  }

  isSuperTypeFor(type) {
    return (
      type instanceof $AppliedImmutable && this.readonly.isSuperTypeFor(type.readonly)
    );
  }

  contains(type) {
    return this.readonly.contains(type);
  }

  weakContains(type) {
    return this.readonly.contains(type);
  }

  changeAll(...args) {
    const changed = this.readonly.changeAll(...args);
    if (changed === this.readonly) {
      return this;
    }
    return $AppliedImmutable.term(null, {}, changed);
  }

  getPropertyType(propertyName: mixed): ?Type {
    const propertyType = this.readonly.getPropertyType(propertyName);
    if (propertyType === null || propertyType instanceof $AppliedImmutable) {
      return propertyType;
    }
    return $AppliedImmutable.term(null, {}, propertyType);
  }
}

export class $Immutable extends GenericType {
  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super(
      "$Immutable",
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
    if (!(target instanceof Type)) {
      throw new HegelError("First parameter should be an type", loc);
    }
    return $AppliedImmutable.term(
      `$Immutable<${String(target.name)}>`,
      { parent: target.parent },
      target
    );
  }
}
