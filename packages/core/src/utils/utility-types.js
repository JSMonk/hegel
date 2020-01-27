import { $Keys } from "../type-graph/types/keys-type";
import { $Pick } from "../type-graph/types/pick-type";
import { $Omit } from "../type-graph/types/omit-type";
import { $TypeOf } from "../type-graph/types/type-of-type";
import { $Throws } from "../type-graph/types/throws-type";
import { $Values } from "../type-graph/types/values-type";
import { $Partial } from "../type-graph/types/partial-type";
import { $ReturnType } from "../type-graph/types/return-type";
import { $InstanceOf } from "../type-graph/types/instance-of-type";
import { $PropertyType } from "../type-graph/types/property-type";
import { $Intersection } from "../type-graph/types/intersection-type";

const mixUtilityTypes = moduleScope => {
  const typeScope = moduleScope.typeScope;
  const utilityTypes = new Map([
    [
      "$PropertyType",
      new $PropertyType($PropertyType.name, { parent: typeScope })
    ],
    ["$InstanceOf", new $InstanceOf($InstanceOf.name, { parent: typeScope })],
    ["$Keys", new $Keys($Keys.name, { parent: typeScope })],
    ["$Values", new $Values($Values.name, { parent: typeScope })],
    ["$Partial", new $Partial($Partial.name, { parent: typeScope })],
    ["$Pick", new $Pick($Pick.name, { parent: typeScope })],
    ["$Omit", new $Omit($Omit.name, { parent: typeScope })],
    ["$ReturnType", new $ReturnType($ReturnType.name, { parent: typeScope })],
    ["$TypeOf", new $TypeOf($TypeOf.name, { parent: typeScope })],
    [
      "$Intersection",
      new $Intersection($Intersection.name, { parent: typeScope })
    ],
    ["$Throws", new $Throws($Throws.name, { parent: typeScope })]
  ]);
  for (const [name, type] of utilityTypes) {
    typeScope.body.set(name, type);
    type.parent = typeScope;
  }
};

export default mixUtilityTypes;
