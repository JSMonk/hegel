import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TupleType } from "./tuple-type";
import { TypeScope } from "../type-scope";
import { UnionType } from "./union-type";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";
import { CollectionType } from "./collection-type";

export class $Values extends GenericType {
  static get name() {
    return "$Values";
  }

  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super("$Values", meta, [TypeVar.term("target", { parent })], parent, null);
  }

  isPrincipalTypeFor() {
    return false;
  }

  equalsTo() {
    return false;
  }

  isSuperTypeFor() {
    return false;
  }

  applyGeneric(parameters, loc) {
    super.assertParameters(parameters, loc);
    const [currentTarget] = parameters;
    const realTarget = this.getOponentType(currentTarget);
    if (realTarget instanceof TypeVar) {
      return this.bottomizeWith(parameters, realTarget.parent, loc);
    }
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
      return realTarget.isSubtypeOf.valueType;
    }
    if (realTarget instanceof CollectionType) {
      return realTarget.valueType;
    }
    const values = [...realTarget.properties.values()];
    const variants = values.map((value) => value.type);
    if (!realTarget.isStrict) {
      variants.push(Type.Unknown);
    }
    return UnionType.term(null, {}, variants);
  }
}
