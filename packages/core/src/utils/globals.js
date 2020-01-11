import { Type } from "../type-graph/types/type";
import { VariableInfo } from "../type-graph/variable-info";

const mixBaseGlobals = moduleScope => {
  const typeScope = moduleScope.typeScope;
  const globalTypes = [
    ["unknown", Type.new("unknown", { parent: typeScope })],
    ["never", Type.new("never", { parent: typeScope })],
    ["undefined", Type.new("undefined", { parent: typeScope })],
    [null, Type.new(null, { parent: typeScope })],
    ["number", Type.new("number", { parent: typeScope })],
    ["bigint", Type.new("bigint", { parent: typeScope })],
    ["string", Type.new("string", { parent: typeScope })],
    ["boolean", Type.new("boolean", { parent: typeScope })],
    ["symbol", Type.new("symbol", { parent: typeScope })]
  ];
  const globals = [
    ["undefined", new VariableInfo(typeScope.body.get("undefined"))]
  ];
  typeScope.body = new Map(globalTypes.concat([...typeScope.body]));
  moduleScope.body = new Map(globals.concat([...moduleScope.body]));
};

export default mixBaseGlobals;
