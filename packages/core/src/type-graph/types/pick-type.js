import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { UnionType } from "./union-type";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";
import { VariableInfo } from "../variable-info";

export class $Pick extends GenericType {
  constructor() {
    super(
      "$Pick",
      [new TypeVar("target"), new TypeVar("properties")],
      null,
      null
    );
  }

  applyGeneric(
    parameters,
    loc,
    shouldBeMemoize = true,
    isCalledAsBottom = false
  ) {
    super.assertParameters(parameters, loc);
    const [target, properties] = parameters;
    const realTarget = target.constraint || target;
    if (!(realTarget instanceof ObjectType)) {
      throw new HegelError("First parameter should be an object type", loc);
    }
    const picks =
      properties instanceof UnionType ? properties.variants : [properties];
    const pickedProperties = picks.map(variant => {
      if (
        variant.isSubtypeOf &&
        variant.isSubtypeOf.equalsTo(new Type("string"))
      ) {
        return variant.name;
      }
      throw new HegelError(
        "The second parameter should be an string literals type"
      );
    });
    const oldProperties = [...realTarget.properties.entries()];
    const newProperties = oldProperties.filter(([name, property]) =>
      pickedProperties.includes(name)
    );
    return new ObjectType(ObjectType.getName(newProperties), newProperties);
  }
}
