import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TupleType } from "./tuple-type";
import { TypeScope } from "../type-scope";
import { UnionType } from "./union-type";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";
import { CollectionType } from "./collection-type";
import { CALLABLE, CONSTRUCTABLE, INDEXABLE } from "../constants";

export class $Keys extends GenericType {
  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super("$Keys", meta, [TypeVar.term("target", { parent })], parent, null);
  }

  applyGeneric(
    parameters,
    loc,
    shouldBeMemoize = true,
    isCalledAsBottom = false
  ) {
    super.assertParameters(parameters, loc);
    const [realTarget] = parameters;
    if (
      !(realTarget instanceof ObjectType) &&
      !(realTarget instanceof TupleType) &&
      !(realTarget instanceof CollectionType)
    ) {
      throw new HegelError(
        "First parameter should be an object or collection type",
        loc
      );
    }
    if (realTarget instanceof TupleType) {
      return realTarget.isSubtypeOf.keyType;
    }
    if (realTarget instanceof CollectionType) {
      return realTarget.keyType;
    }
    const variants = [];
    for (const property of realTarget.properties.keys()) {
      if (property !== CALLABLE && property !== CONSTRUCTABLE && property !== INDEXABLE) {
        variants.push(Type.term(`'${property}'`, { isSubtypeOf: Type.String }));
      }
    }
    return UnionType.term(UnionType.getName(variants), {}, variants);
  }
}
