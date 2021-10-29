import HegelError from "../../utils/errors";
import { Type } from "./type";
import { $Keys } from "./keys-type";
import { TypeVar } from "./type-var";
import { TupleType } from "./tuple-type";
import { UnionType } from "./union-type";
import { TypeScope } from "../type-scope";
import { ObjectType } from "./object-type";
import { $BottomType } from "./bottom-type";
import { GenericType } from "./generic-type";
import { VariableInfo } from "../variable-info";
import { CollectionType } from "./collection-type";

export class $PropertyType extends GenericType {
  static get name() {
    return "$PropertyType";
  }

  constructor(_, meta = {}, isForInit = false) {
    const parent = new TypeScope(meta.parent);
    super(
      "$PropertyType",
      meta,
      [
        TypeVar.term("target", { parent }),
        TypeVar.term("property", { parent }),
      ],
      parent,
      null
    );
    this.isForInit = isForInit;
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
    isCalledAsBottom = false,
    initializing = false
  ) {
    super.assertParameters(parameters, loc);
    const [currentTarget, property] = parameters;
    const realTarget = this.getOponentType(currentTarget, true, false);
    const realProperty = this.getOponentType(property);
    let propertyName = realProperty.name;
    if (
      realProperty.isSubtypeOf &&
      realProperty.isSubtypeOf.name === "string"
    ) {
      propertyName = realProperty.name.slice(1, -1);
    } else if (
      realProperty.isSubtypeOf === Type.Symbol ||
      realProperty instanceof TypeVar
    ) {
      propertyName = realProperty;
    }
    const isTargetVariable = realTarget instanceof TypeVar;
    const isPropertyVariable = realProperty instanceof TypeVar;
    if (isTargetVariable && !realTarget.isUserDefined) {
      if (realTarget.constraint === undefined) {
        if (isPropertyVariable) {
          realTarget.constraint = ObjectType.Object.root;
        } else {
          const props = [
            [
              propertyName,
              new VariableInfo(
                TypeVar.term(`${realTarget.name}0`, {
                  parent: realTarget.parent,
                })
              ),
            ],
          ];
          realTarget.constraint = ObjectType.term(
            null,
            { isSoft: true },
            props
          );
        }
      } else if (
        realTarget.constraint instanceof ObjectType &&
        !isPropertyVariable &&
        !realTarget.constraint.properties.has(propertyName)
      ) {
        const props = [
          ...realTarget.constraint.properties,
          [
            propertyName,
            new VariableInfo(
              TypeVar.term(
                `${realTarget.name}${realTarget.constraint.properties.size}`,
                { parent: realTarget.parent }
              )
            ),
          ],
        ];
        realTarget.constraint = ObjectType.term(null, { isSoft: true }, props);
      }
    }
    if (
      isPropertyVariable &&
      !realProperty.isUserDefined &&
      realProperty.constraint === undefined
    ) {
      let constraint = undefined;
      if (realTarget instanceof CollectionType) {
        constraint = realTarget.keyType;
      } else if (realTarget instanceof TupleType) {
        constraint = Array.from({
          length: realTarget.items.length,
        }).map((_, i) => Type.term(i + 1, { isSubtypeOf: Type.Number }));
      } else if (realTarget instanceof ObjectType) {
        constraint = UnionType.term(
          null,
          {},
          [...realTarget.properties].map(([key]) =>
            Type.term(`'${key}'`, { isSubtypeOf: Type.String })
          )
        );
      } else if (isTargetVariable) {
        constraint = new $BottomType({}, new $Keys(), [realTarget]);
      }
      realProperty.constraint = constraint;
    }
    if (isTargetVariable && !realTarget.isUserDefined && !isPropertyVariable) {
      return realTarget.constraint.properties.get(propertyName).type;
    }
    if (realProperty instanceof UnionType) {
      try {
        const variants = realProperty.variants.map((p) =>
          this.applyGeneric(
            [realTarget, p],
            loc,
            shouldBeMemoize,
            isCalledAsBottom
          )
        );
        return UnionType.term(null, {}, variants);
      } catch {
        throw new HegelError(
          `Property "${propertyName}" does not exist in "${currentTarget.name}"`,
          loc
        );
      }
    }
    if (realTarget instanceof UnionType) {
      try {
        const variants = realTarget.variants.map((v) =>
          this.applyGeneric(
            [v, realProperty],
            loc,
            shouldBeMemoize,
            isCalledAsBottom
          )
        );
        return UnionType.term(null, {}, variants);
      } catch {
        throw new HegelError(
          `Property "${propertyName}" does not exist in "${currentTarget.name}"`,
          loc
        );
      }
    }
    const fieldType = realTarget.getPropertyType(
      propertyName,
      initializing,
      this.isForInit
    );
    if (!realProperty.isSubtypeOf && !isCalledAsBottom) {
      throw new HegelError("Second parameter should be an literal", loc);
    }
    if (fieldType !== null) {
      return fieldType;
    }
    if (isPropertyVariable) {
      return this.bottomizeWith(
        [realTarget, realProperty],
        realTarget.parent,
        loc
      );
    }
    throw new HegelError(
      `Property "${propertyName}" does not exist in "${currentTarget.name}"`,
      loc
    );
  }
}
