import { Type } from "../type-graph/types/type";
import { VariableInfo } from "../type-graph/variable-info";

const mixBaseGlobals = moduleScope => {
  const typeScope = moduleScope.typeScope;
  const globalTypes = [
    ["unknown", Type.Unknown],
    ["never", Type.Never],
    ["undefined", Type.Undefined],
    [null, Type.Null],
    ["number", Type.Number],
    ["bigint", Type.BigInt],
    ["string", Type.String],
    ["boolean", Type.Boolean],
    ["symbol", Type.Symbol]
  ];
  const globals = [
    ["undefined", new VariableInfo(Type.Undefined)]
  ];
  typeScope.body = new Map(globalTypes.concat([...typeScope.body]));
  moduleScope.body = new Map(globals.concat([...moduleScope.body]));
};

export default mixBaseGlobals;
