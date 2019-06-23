import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { UnionType } from "./union-type";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";
import { VariableInfo } from "../variable-info";

export class $Partial extends GenericType {
  constructor() {
    super("$Partial", [new TypeVar("target")], null, null);
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
    if (!(realTarget instanceof ObjectType)) {
      throw new HegelError("First parameter should be an object type", loc);
    }
    const oldProperties = [...realTarget.properties.entries()];
    const newProperties = oldProperties.map(([name, property]) => {
      const variants = [
        new Type("undefined"),
        ...(property.type instanceof UnionType
          ? property.type.variants
          : [property.type])
      ];
      const newType = new UnionType(UnionType.getName(variants), variants);
      return [name, new VariableInfo(newType, property.parent, property.meta)];
    });
    return new ObjectType(ObjectType.getName(newProperties), newProperties);
  }
}
