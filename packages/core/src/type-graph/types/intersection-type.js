import HegelError from "../../utils/errors";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";
import { $BottomType } from "./bottom-type";
import { $AppliedImmutable } from "./immutable-type";

export class $Intersection extends GenericType {
  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super(
      "$Intersection",
      meta,
      [
        TypeVar.term("target1", { parent }),
        TypeVar.term("target2", { parent })
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
    const [firstObject, secondObject] = parameters;
    const isFirstVar = firstObject instanceof TypeVar;
    const isSecondVar = secondObject instanceof TypeVar;
    if (isFirstVar && !firstObject.isUserDefined) {
      firstObject.constraint = ObjectType.Object;
    }
    if (isSecondVar && !secondObject.isUserDefined) {
      secondObject.constraint = ObjectType.Object;
    }
    if (isFirstVar || isSecondVar) {
      return new $BottomType({}, this, [firstObject, secondObject]);
    }
    if (!(firstObject instanceof ObjectType)) {
      throw new HegelError(
        "First parameter should be an mutable object type",
        loc
      );
    }
    if ("readonly" in secondObject) {
      secondObject = secondObject.readonly;
    }
    if (!(secondObject instanceof ObjectType)) {
      throw new HegelError("Second parameter should be an object type", loc);
    }
    const newProperties = [...firstObject.properties];
    for (const [key, variable] of secondObject.properties.entries()) {
      const existed = firstObject.properties.get(key);
      if (existed !== undefined && existed.type instanceof $AppliedImmutable) {
        throw new HegelError(
          `Attempt to mutate immutable property "${key}" in "${String(
            firstObject.name
          )}" type`,
          loc
        );
      }
      newProperties.push([key, variable]);
    }

    return ObjectType.term(
      ObjectType.getName(newProperties),
      {},
      newProperties
    );
  }
}
