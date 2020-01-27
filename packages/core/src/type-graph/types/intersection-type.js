import HegelError from "../../utils/errors";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";
import { $BottomType } from "./bottom-type";

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
      throw new HegelError("First parameter should be an object type", loc);
    }
    if (!(secondObject instanceof ObjectType)) {
      throw new HegelError("Second parameter should be an object type", loc);
    }
    const newProperties = [
      ...firstObject.properties,
      ...secondObject.properties
    ];
    return ObjectType.term(
      ObjectType.getName(newProperties),
      {},
      newProperties
    );
  }
}
