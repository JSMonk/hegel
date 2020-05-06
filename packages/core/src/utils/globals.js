import { Type } from "../type-graph/types/type";
import { UnionType } from "../type-graph/types/union-type";
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
    [true, Type.True],
    [false, Type.False],
    ["boolean", UnionType.Boolean],
    ["symbol", Type.Symbol]
  ];
  const globals = [["undefined", new VariableInfo(Type.Undefined)]];
  for (const [name, type] of globalTypes) {
    typeScope.body.set(name, type);
    type.parent = typeScope;
  }
  for (const [name, variable] of globals) {
    moduleScope.body.set(name, variable);
    variable.parent = moduleScope;
  }
};

export default mixBaseGlobals;
