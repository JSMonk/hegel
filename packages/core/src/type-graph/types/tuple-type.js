// @flow
import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { UnionType } from "./union-type";
import { $BottomType } from "./bottom-type";
import { CollectionType } from "./collection-type";
import type { TypeMeta } from "./type";

export class TupleType extends Type {
  static Array = new TypeVar("Array");

  static term(
    name: mixed,
    meta?: TypeMeta = {},
    items: Array<Type>,
    ...args: Array<any>
  ) {
    let parent: TypeScope | void = meta.parent;
    const length = items.length;
    for (let i = 0; i < length; i++) {
      const item = items[i];
      if (
        !TypeVar.isSelf(item) &&
        (parent === undefined || parent.priority < item.parent.priority)
      ) {
        parent = item.parent;
      }
    }
    name = name === null ? TupleType.getName(items) : name;
    const newMeta = { ...meta, parent };
    return super.term(name, newMeta, items, ...args);
  }

  static mutable = [
    "pop",
    "push",
    "reverse",
    "shift",
    "sort",
    "splice",
    "unshift"
  ];

  static getName(params: Array<Type> | Type) {
    if (params instanceof Type) {
      return String(params.name);
    }
    return `[${params.reduce(
      (res, t) => `${res}${res ? ", " : ""}${String(t.name)}`,
      ""
    )}]`;
  }

  items: Array<Type>;
  onlyLiteral: boolean = true;

  constructor(name: mixed, meta: TypeMeta = {}, items: Array<Type>) {
    const arrayValue = [
      items.length !== 0 ? UnionType.term(null, {}, items) : Type.Unknown
    ];
    const isSubtypeOf =
      TupleType.Array.root === undefined
        ? new $BottomType({}, TupleType.Array, arrayValue)
        : TupleType.Array.root.applyGeneric(arrayValue);
    super(name, { ...meta, isSubtypeOf });
    this.items = items;
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: TypeScope
  ) {
    let isItemsChanged = false;
    const newItems = this.items.map(t => {
      const newT = t.changeAll(sourceTypes, targetTypes, typeScope);
      if (newT === t) {
        return t;
      }
      isItemsChanged = true;
      return newT;
    });
    const isSubtypeOf =
      this.isSubtypeOf &&
      this.isSubtypeOf.changeAll(sourceTypes, targetTypes, typeScope);
    if (!isItemsChanged && isSubtypeOf === this.isSubtypeOf) {
      return this;
    }
    return TupleType.term(null, { isSubtypeOf }, newItems);
  }

  isSuperTypeFor(anotherType: Type) {
    anotherType = this.getOponentType(anotherType);
    return (
      anotherType instanceof TupleType &&
      anotherType.items.length === this.items.length &&
      //$FlowIssue - instanceof type refinement
      this.items.every((t, i) => t.isPrincipalTypeFor(anotherType.items[i]))
    );
  }

  equalsTo(anotherType: Type) {
    anotherType = this.getOponentType(anotherType);
    if (this.referenceEqualsTo(anotherType)) {
      return true;
    }
    const anotherVariants =
      anotherType instanceof TupleType ? anotherType.items : [];
    return (
      anotherType instanceof TupleType &&
      super.equalsTo(anotherType) &&
      this.items.length === anotherVariants.length &&
      this.items.every((type, index) => type.equalsTo(anotherVariants[index]))
    );
  }

  getPropertyType(propertyIndex: mixed): ?Type {
    if (typeof propertyIndex === "number") {
      return propertyIndex < this.items.length
        ? this.items[propertyIndex]
        : null;
    }
    if (propertyIndex === "length") {
      return Type.term(this.items.length, { isSubtypeOf: Type.Number });
    }
    if (TupleType.mutable.includes(propertyIndex)) {
      throw new HegelError(
        "You trying to use tuple as Array, please setup variable type as Array"
      );
    }
    return super.getPropertyType(propertyIndex);
  }

  getDifference(type: Type) {
    if (type instanceof TupleType) {
      let differences = [];
      const { items } = type;
      this.items.forEach((type, index) => {
        const other = items[index];
        if (other === undefined) {
          return;
        }
        differences = differences.concat(type.getDifference(other));
      });
      return differences;
    }
    if (type instanceof CollectionType) {
      // $FlowIssue
      return this.isSubtypeOf.getDifference(type);
    }
    return super.getDifference(type);
  }

  contains(type: Type) {
    return super.contains(type) || this.items.some(i => i.contains(type));
  }

  weakContains(type: Type) {
    return super.contains(type) || this.items.some(i => i.weakContains(type));
  }
}
