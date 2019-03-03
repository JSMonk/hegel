import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import { $PropertyType } from "../type-graph/types/property-type";
import { TYPE_SCOPE, UNDEFINED_TYPE } from "../type-graph/constants";

const mixUtilityTypes = moduleScope => {
  const typeScope = moduleScope.body.get(TYPE_SCOPE);
  const utilityTypes = new Map([
    ["$PropertyType", new VariableInfo(new $PropertyType())]
  ]);

  typeScope.body = new Map([...typeScope.body, ...utilityTypes]);
};

export default mixUtilityTypes;
