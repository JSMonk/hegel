// @flow
import { Type } from "./type";
import { UnionType } from "./union-type";
import { CollectionType } from "./collection-type";
import { getNameForType } from "../../utils/type-utils";
import { createTypeWithName } from "./create-type";
import type { Scope } from "../scope";

export class TupleType extends Type {
  static createTypeWithName = createTypeWithName(TupleType);

  static getName(params: Array<Type>) {
    return `[${params.reduce(
      (res, t) => `${res}${res ? ", " : ""}${getNameForType(t)}`,
      ""
    )}]`;
  }

  items: Array<Type>;

  constructor(name: string, items: Array<Type>) {
    const valueType = UnionType.shouldBeUnion(items)
      ? new UnionType(UnionType.getName(items), items)
      : items[0];
    super(name, {
      isSubtypeOf: new CollectionType(
        `{ [key: nunmber]: ${getNameForType(valueType)} }`,
        new Type("number"),
        valueType
      )
    });
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
    if (!isItemsChanged) {
      return this;
    }
    return TupleType.createTypeWithName(
      TupleType.getName(newItems),
      typeScope,
      newItems
    );
  }

  isSuperTypeFor(anotherType: Type) {
    return (
      anotherType instanceof TupleType &&
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
}
