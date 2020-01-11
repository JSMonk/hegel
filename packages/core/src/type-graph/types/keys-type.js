import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TupleType } from "./tuple-type";
import { TypeScope } from "../type-scope";
import { UnionType } from "./union-type";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";
import { CollectionType } from "./collection-type";

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
    const [target] = parameters;
    const realTarget = target.constraint || target;
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
    const keys = [...realTarget.properties.keys()];
    const variants = keys.map(key =>
      Type.term(`'${key}'`, { isSubtypeOf: Type.String })
    );
    return UnionType.term(UnionType.getName(variants), {}, variants);
  }
}
