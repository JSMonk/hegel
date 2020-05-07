import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TupleType } from "./tuple-type";
import { TypeScope } from "../type-scope";
import { GenericType } from "./generic-type";
import { CollectionType } from "./collection-type";

export class $AppliedImmutable extends Type {
  static get name() {
    return "$AppliedImmutable";
  }

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
    name = name || this.getName(type);
    if (
      type instanceof CollectionType &&
      CollectionType.Array.root !== undefined &&
      type.equalsTo(CollectionType.Array.root.applyGeneric([type.valueType]))
    ) {
      type = TupleType.ReadonlyArray.root.applyGeneric([type.valueType]);
    }
    super(name, meta);
    this.readonly = type;
  }

  equalsTo(type) {
    if (
      type.referenceEqualsTo(this) ||
      (type instanceof CollectionType &&
        type.equalsTo(
          TupleType.ReadonlyArray.root.applyGeneric([type.valueType])
        ))
    ) {
      return true;
    }
    if (type instanceof $AppliedImmutable) {
      return (
        type instanceof $AppliedImmutable &&
        this.readonly.equalsTo(type.readonly)
      );
    }
    return this.readonly.isPrincipalTypeFor(type);
  }

  isSuperTypeFor(type) {
    if (type.onlyLiteral || type instanceof $AppliedImmutable) {
      return (
        type instanceof $AppliedImmutable &&
        this.readonly.isSuperTypeFor(type.readonly)
      );
    }
    return this.readonly.isSuperTypeFor(type);
  }

  contains(type) {
    return this.readonly.contains(type);
  }

  weakContains(type) {
    return this.readonly.contains(type);
  }

  getDifference(type: Type, withReverseUnion?: boolean = false) {
    return this.readonly.getDifference(type, withReverseUnion);
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
  static get name() {
    return "$Immutable";
  }

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
    return $AppliedImmutable.term(null, { parent: target.parent }, target);
  }
}
