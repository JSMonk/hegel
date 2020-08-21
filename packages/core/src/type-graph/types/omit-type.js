import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { UnionType } from "./union-type";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";

export class $Omit extends GenericType {
  static get name() {
    return "$Omit";
  }

  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super(
      "$Omit",
      meta,
      [
        TypeVar.term("target", { parent }),
        TypeVar.term("properties", { parent }),
      ],
      parent,
      null
    );
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

  applyGeneric(
    parameters,
    loc,
    shouldBeMemoize = true,
    isCalledAsBottom = false
  ) {
    super.assertParameters(parameters, loc);
    const [target, properties] = parameters;
    const realTarget = this.getOponentType(target);
    if (realTarget instanceof TypeVar) {
      return this.bottomizeWith(parameters, realTarget.parent, loc);
    }
    if (!(realTarget instanceof ObjectType)) {
      throw new HegelError("First parameter should be an object type", loc);
    }
    const picks =
      properties instanceof UnionType ? properties.variants : [properties];
    const pickedProperties = picks.map((variant) => {
      if (variant.isSubtypeOf && variant.isSubtypeOf.equalsTo(Type.String)) {
        return variant.name;
      }
      throw new HegelError(
        "The second parameter should be an string literals type"
      );
    });
    const oldProperties = [...realTarget.properties.entries()];
    const newProperties = oldProperties.filter(
      ([name]) => !pickedProperties.includes(`'${name}'`)
    );
    return ObjectType.term(
      ObjectType.getName(newProperties),
      {},
      newProperties
    );
  }
}
