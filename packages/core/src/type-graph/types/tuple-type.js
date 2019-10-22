// @flow
import { Type } from "./type";
import { UnionType } from "./union-type";
import { CollectionType } from "./collection-type";
import { getNameForType } from "../../utils/type-utils";
import { createTypeWithName } from "./create-type";
import type { Scope } from "../scope";
import type { TypeMeta } from "./type";

export class TupleType extends Type {
  static createTypeWithName = createTypeWithName(TupleType);

  static getName(params: Array<Type> | Type) {
    if (params instanceof Type) {
      return String(params.name);
    }
    return `[${params.reduce(
      (res, t) => `${res}${res ? ", " : ""}${getNameForType(t)}`,
      ""
    )}]`;
  }

  items: Array<Type>;

  constructor(name: mixed, items: Array<Type>, meta: TypeMeta = {}) {
    const valueType = new UnionType(UnionType.getName(items), items);
    super(name, meta);
    this.items = items;
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
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
    return TupleType.createTypeWithName(
      this.getChangedName(sourceTypes, targetTypes),
      typeScope,
      newItems,
      { isSubtypeOf }
    );
  }

  isSuperTypeFor(anotherType: Type) {
    return (
      anotherType instanceof TupleType &&
      anotherType.items.length === this.items.length &&
      //$FlowIssue - instanceof type refinement
      this.items.every((t, i) => anotherType.items[i].isPrincipalTypeFor(t))
    );
  }

  equalsTo(anotherType: Type) {
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
    if (
      typeof propertyIndex === "number" &&
      propertyIndex < this.items.length
    ) {
      return this.items[propertyIndex];
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
}
