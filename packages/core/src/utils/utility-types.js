import HegelError from "./errors";
import { Type } from "../type-graph/types/type";
import { TypeVar } from "../type-graph/types/type-var";
import { ObjectType } from "../type-graph/types/object-type";
import { GenericType } from "../type-graph/types/generic-type";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import { FunctionType } from "../type-graph/types/function-type";
import { CollectionType } from "../type-graph/types/collection-type";
import { TYPE_SCOPE, UNDEFINED_TYPE } from "../type-graph/constants";

const mixUtilityTypes = moduleScope => {
  const typeScope = moduleScope.body.get(TYPE_SCOPE);
  // $FlowIssue
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
