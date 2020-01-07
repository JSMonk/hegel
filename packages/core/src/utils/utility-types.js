import { $Keys } from "../type-graph/types/keys-type";
import { $Pick } from "../type-graph/types/pick-type";
import { $Omit } from "../type-graph/types/omit-type";
import { $TypeOf } from "../type-graph/types/type-of-type";
import { $Values } from "../type-graph/types/values-type";
import { $Partial } from "../type-graph/types/partial-type";
import { TYPE_SCOPE } from "../type-graph/constants";
import { $ReturnType } from "../type-graph/types/return-type";
import { $InstanceOf } from "../type-graph/types/instance-of-type";
import { VariableInfo } from "../type-graph/variable-info";
import { $PropertyType } from "../type-graph/types/property-type";

const mixUtilityTypes = moduleScope => {
  const typeScope = moduleScope.body.get(TYPE_SCOPE);
  const utilityTypes = new Map([
    ["$PropertyType", new VariableInfo(new $PropertyType())],
    ["$InstanceOf", new VariableInfo(new $InstanceOf())],
    ["$Keys", new VariableInfo(new $Keys())],
    ["$Values", new VariableInfo(new $Values())],
    ["$Partial", new VariableInfo(new $Partial())],
    ["$Pick", new VariableInfo(new $Pick())],
    ["$Omit", new VariableInfo(new $Omit())],
    ["$ReturnType", new VariableInfo(new $ReturnType())],
    ["$TypeOf", new VariableInfo(new $TypeOf())]
  ]);

  typeScope.body = new Map([...typeScope.body, ...utilityTypes]);
};

export default mixUtilityTypes;
