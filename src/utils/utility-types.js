import HegelError from "./errors";
import {
  Type,
  ObjectType,
  FunctionType,
  GenericType,
  ModuleScope,
  ZeroLocation,
  CollectionType,
  TypeVar,
  TYPE_SCOPE,
  VariableInfo
} from "../type/types";

const mixUtilityTypes = moduleScope => {
  const typeScope = moduleScope.body.get(TYPE_SCOPE);
  class $PropertyType extends GenericType {
    constructor() {
      super(
        "$PropertyType",
        [new TypeVar("target"), new TypeVar("property")],
        null,
        new FunctionType(
          "$PropertyType",
          [new TypeVar("target"), new TypeVar("property")],
          null
        )
      );
    }

    applyGeneric(parameters, loc, shouldBeMemoize = true) {
      super.assertParameters(parameters, loc);
      const [target, property] = parameters;
      if (
        property.isLiteralOf !== Type.createTypeWithName("string", typeScope) ||
        (target instanceof CollectionType &&
          !property.equalsTo(target.keyType)) ||
        !(target instanceof ObjectType || target instanceof CollectionType)
      ) {
        throw new HegelError(
          `Property "${property.name}" are not exists in "${target.name}"`,
          loc
        );
      }
      try {
        return {
          ...this.subordinateType,
          returnType: target.getPropertyType(property.name)
        };
      } catch {
        throw new HegelError(
          `Property "${property.name}" are not exists in "${target.name}"`,
          loc
        );
      }
    }
  }
  const utilityTypes = new Map([
    ["$PropertyType", new VariableInfo(new $PropertyType())]
  ]);

  typeScope.body = new Map([...typeScope.body, ...utilityTypes]);
};

export default mixUtilityTypes;
