import HegelError from "../../utils/errors";
import { Type } from "./type";
import { TypeVar } from "./type-var";
import { UnionType } from "./union-type";
import { TypeScope } from "../type-scope";
import { ObjectType } from "./object-type";
import { $BottomType } from "./bottom-type";
import { GenericType } from "./generic-type";

export class $PropertyType extends GenericType {
  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super(
      "$PropertyType",
      meta,
      [
        TypeVar.term("target", { parent }),
        TypeVar.term("property", { parent })
      ],
      parent,
      null
    );
  }

  findRealTarget(target, loc) {
    if (target instanceof UnionType) {
      return target;
    }
    let obj = target;
    while (obj !== null && !(obj instanceof ObjectType)) {
      obj = obj.isSubtypeOf;
    }
    return obj;
  }

  applyGeneric(
    parameters,
    loc,
    shouldBeMemoize = true,
    isCalledAsBottom = false,
    initializing = false
  ) {
    super.assertParameters(parameters, loc);
    const [currentTarget, property] = parameters;
    const realTarget = Type.getTypeRoot(
      currentTarget.constraint != undefined
        ? currentTarget.constraint
        : currentTarget
    );
    const propertyName =
      property.isSubtypeOf && property.isSubtypeOf.name === "string"
        ? property.name.slice(1, -1)
        : property.name;

    if (property instanceof TypeVar && property.root === undefined) {
      return new $BottomType({}, this, [realTarget, property], loc);
    }

    if (realTarget instanceof UnionType) {
      try {
        const variants = realTarget.variants.map(v =>
          this.applyGeneric(
            [v, property],
            loc,
            shouldBeMemoize,
            isCalledAsBottom
          )
        );
        return UnionType.term(UnionType.getName(variants), {}, variants);
      } catch {
        throw new HegelError(
          `Property "${propertyName}" does not exist in "${
            currentTarget.name
          }"`,
          loc
        );
      }
    }
    const fieldType = realTarget.getPropertyType(propertyName, initializing);
    if (!property.isSubtypeOf && !isCalledAsBottom) {
      throw new HegelError("Second parameter should be an literal", loc);
    }
    if (fieldType !== null) {
      return fieldType;
    }
    throw new HegelError(
      `Property "${propertyName}" are not exists in "${currentTarget.name}"`,
      loc
    );
  }
}
