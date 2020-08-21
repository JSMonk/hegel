import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { UnionType } from "./union-type";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";
import { VariableInfo } from "../variable-info";

export class $Partial extends GenericType {
  static get name() {
    return "$Partial";
  }

  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super("$Partial", meta, [TypeVar.term("target", { parent })], parent, null);
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
    const [target] = parameters;
    const realTarget = this.getOponentType(target);
    if (realTarget instanceof TypeVar) {
      return this.bottomizeWith(parameters, realTarget.parent, loc);
    }
    if (!(realTarget instanceof ObjectType)) {
      throw new HegelError("First parameter should be an object type", loc);
    }
    const oldProperties = [...realTarget.properties.entries()];
    const newProperties = oldProperties.map(([name, property]) => {
      const variants = [
        Type.Undefined,
        ...(property.type instanceof UnionType
          ? property.type.variants
          : [property.type]),
      ];
      const newType = UnionType.term(null, {}, variants);
      return [name, new VariableInfo(newType, property.parent, property.meta)];
    });
    return ObjectType.term(
      ObjectType.getName(newProperties, undefined, !realTarget.isStrict),
      { isSoft: !realTarget.isStrict },
      newProperties
    );
  }
}
