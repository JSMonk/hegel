import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TupleType } from "./tuple-type";
import { TypeScope } from "../type-scope";
import { UnionType } from "./union-type";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";
import { CollectionType } from "./collection-type";

export class $Entries extends GenericType {
  static get name() {
    return "$Entries";
  }

  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super("$Entries", meta, [TypeVar.term("target", { parent })], parent, null);
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
      !(realTarget instanceof CollectionType)
    ) {
      throw new HegelError(
        "First parameter should be an object or collection type",
        loc
      );
    }
    if (realTarget instanceof CollectionType) {
      return TupleType.term(null, {}, [
        realTarget.keyType,
        realTarget.valueType,
      ]);
    }
    const values = [...realTarget.properties.entries()];
    const variants = values.map(([key, value]) =>
      TupleType.term(null, {}, [
        Type.term(`'${key}'`, { isSubtypeOf: Type.String }),
        value.type,
      ])
    );
    if (!realTarget.isStrict) {
      variants.push(Type.Unknown);
    }
    return UnionType.term(null, {}, variants);
  }
}
