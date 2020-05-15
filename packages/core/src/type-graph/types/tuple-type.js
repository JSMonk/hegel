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
  static get name() {
    return "TupleType";
  }

  static ReadonlyArray = new TypeVar("ReadonlyArray");

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
        item instanceof Type &&
        (parent === undefined || parent.priority < item.parent.priority)
      ) {
        // $FlowIssue
        parent = item.parent;
      }
    }
    name = name === null ? TupleType.getName(items) : name;
    const newMeta = { ...meta, parent };
    return super.term(name, newMeta, items, ...args);
  }

  static getName(params: Array<Type> | Type) {
    if (params instanceof Type) {
      return String(params.name);
    }
    const isMultyLine = this.prettyMode && params.length >= 4;
    return `[${isMultyLine ? "\n\t" : ""}${params.reduce(
      (res, t) =>
        `${res}${res ? `,${isMultyLine ? "\n\t" : " "}` : ""}${String(
          Type.getTypeRoot(t).name
        ).replace(/\n/g, "\n\t")}`,
      ""
    )}${isMultyLine ? "\n" : ""}]`;
  }

  items: Array<Type>;
  onlyLiteral: boolean = true;

  constructor(name: mixed, meta: TypeMeta = {}, items: Array<Type>) {
    const arrayValue = [
      items.length !== 0 ? UnionType.term(null, {}, items) : Type.Unknown
    ];
    const isSubtypeOf =
      TupleType.ReadonlyArray.root === undefined
        ? new $BottomType({}, TupleType.ReadonlyArray, arrayValue)
        : // $FlowIssue ReadonlyArray is always GenericType
          TupleType.ReadonlyArray.root.applyGeneric(arrayValue);
    super(name, { ...meta, isSubtypeOf });
    this.items = items;
    this.priority = items.length * 10;
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: TypeScope
  ) {
    if (sourceTypes.every(type => !this.canContain(type))) {
      return this;
    }
    const currentSelf = TypeVar.createSelf(
      this.getChangedName(sourceTypes, targetTypes),
      this.parent
    );
    if (
      this._changeStack !== null &&
      this._changeStack.find(a => a.equalsTo(currentSelf))
    ) {
      return currentSelf;
    }
    this._changeStack =
      this._changeStack === null
        ? [currentSelf]
        : [...this._changeStack, currentSelf];
    try {
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
      return this.endChanges(
        !isItemsChanged && isSubtypeOf === this.isSubtypeOf
          ? this
          : TupleType.term(null, { isSubtypeOf }, newItems)
      );
    } catch (e) {
      this._changeStack = null;
      throw e;
    }
  }

  isSuperTypeFor(anotherType: Type) {
    anotherType = this.getOponentType(anotherType);
    if (this._alreadyProcessedWith === anotherType) {
      return true;
    }
    this._alreadyProcessedWith = anotherType;
    const result =
      anotherType instanceof TupleType &&
      anotherType.items.length === this.items.length &&
      //$FlowIssue - instanceof type refinement
      this.items.every((t, i) => t.isPrincipalTypeFor(anotherType.items[i]));
    this._alreadyProcessedWith = null;
    return result;
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
      anotherType instanceof TupleType ? anotherType.items : [];
    const result =
      anotherType instanceof TupleType &&
      super.equalsTo(anotherType) &&
      this.canContain(anotherType) &&
      this.items.length === anotherVariants.length &&
      this.items.every((type, index) => type.equalsTo(anotherVariants[index]));
    this._alreadyProcessedWith = null;
    return result;
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
    if (this.isSubtypeOf instanceof $BottomType) {
      const unpacked = this.isSubtypeOf.unpack();
      if (TupleType.ReadonlyArray.root !== undefined) {
        this.isSubtypeOf = unpacked;
      }
      return unpacked.getPropertyType(propertyIndex);
    }
    return super.getPropertyType(propertyIndex);
  }

  getDifference(type: Type, withReverseUnion?: boolean = false) {
    if (this._alreadyProcessedWith === type || this.referenceEqualsTo(type)) {
      return [];
    }
    this._alreadyProcessedWith = type;
    if (type instanceof TupleType && this.items.length === type.items.length) {
      let differences = [];
      const { items } = type;
      this.items.forEach((type, index) => {
        const other = items[index];
        if (other === undefined) {
          return;
        }
        differences = differences.concat(
          type.getDifference(other, withReverseUnion)
        );
      });
      this._alreadyProcessedWith = null;
      return differences;
    }
    if (type instanceof CollectionType) {
      // $FlowIssue
      const result = this.isSubtypeOf.getDifference(type, withReverseUnion);
      this._alreadyProcessedWith = null;
      return result;
    }
    const result = super.getDifference(type, withReverseUnion);
    this._alreadyProcessedWith = null;
    return result;
  }

  contains(type: Type) {
    if (this._alreadyProcessedWith === type || !this.canContain(type)) {
      return false;
    }
    this._alreadyProcessedWith = type;
    const result =
      super.contains(type) || this.items.some(i => i.contains(type));
    this._alreadyProcessedWith = null;
    return result;
  }

  weakContains(type: Type) {
    if (this._alreadyProcessedWith === type || !this.canContain(type)) {
      return false;
    }
    this._alreadyProcessedWith = type;
    const result =
      super.contains(type) || this.items.some(i => i.weakContains(type));
    this._alreadyProcessedWith = null;
    return result;
  }

  getNextParent(typeScope: TypeScope) {
    if (this._alreadyProcessedWith !== null) {
      return Type.GlobalTypeScope;
    }
    this._alreadyProcessedWith = this;
    const sortedParents = [...this.items]
      .map(a => a.getNextParent(typeScope))
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
