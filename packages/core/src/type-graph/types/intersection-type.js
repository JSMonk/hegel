import HegelError from "../../utils/errors";
import { TypeVar } from "./type-var";
import { TypeScope } from "../type-scope";
import { ObjectType } from "./object-type";
import { GenericType } from "./generic-type";
import { $BottomType } from "./bottom-type";
import { $AppliedImmutable } from "./immutable-type";

export class $Intersection extends GenericType {
  static get name() {
    return "$Intersection";
  }

  constructor(_, meta = {}) {
    const parent = new TypeScope(meta.parent);
    super("$Intersection", meta, [], parent, null);
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

  applyGeneric(objects, loc, shouldBeMemoize = true, isCalledAsBottom = false) {
    if (objects.length < 2) {
      throw new HegelError(
        "$Intersection required at minimum 2 type parameters.",
        loc
      );
    }
    let containsVariable = false;
    let theMostPriorityParent = objects[0].parent;
    const objectTypes = objects.map((obj, i) => {
      const isVar = obj instanceof TypeVar;
      if (isVar) {
        containsVariable = true;
        theMostPriorityParent =
          theMostPriorityParent.priority < obj.parent.priority
            ? obj.parent
            : theMostPriorityParent;
        if (!obj.isUserDefined) {
          obj.constraint = ObjectType.Object;
        }
      }
      if (obj instanceof $BottomType) {
        obj = obj.unpack();
      }
      return i !== 0 && "readonly" in obj ? obj.readonly : obj;
    });
    if (containsVariable) {
      return this.bottomizeWith(objects, theMostPriorityParent, loc);
    }
    const wrongIndex = objectTypes.findIndex(a => !(a instanceof ObjectType));
    if (wrongIndex !== -1) {
      throw new HegelError(
        `All parameters should be an object type. Only first parameter should mutable object type. ${wrongIndex} is not.`,
        loc
      );
    }
    const [firstObject, ...restObjects] = objectTypes;
    const newProperties = [...firstObject.properties];
    for (const obj of restObjects) {
      for (const [key, variable] of obj.properties.entries()) {
        const existed = firstObject.properties.get(key);
        if (
          existed !== undefined &&
          existed.type instanceof $AppliedImmutable
        ) {
          throw new HegelError(
            `Attempt to mutate immutable property "${key}" in "${String(
              firstObject.name
            )}" type`,
            loc
          );
        }
        newProperties.push([key, variable]);
      }
    }
    return ObjectType.term(
      ObjectType.getName(newProperties),
      {},
      newProperties
    );
  }
}
