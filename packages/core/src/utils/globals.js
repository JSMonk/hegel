import { Type } from "../type-graph/types/type";
import { TYPE_SCOPE } from "../type-graph/constants";
import { VariableInfo } from "../type-graph/variable-info";

const mixBaseGlobals = moduleScope => {
  const typeScope = moduleScope.body.get(TYPE_SCOPE);
  const globalTypes = [
    ["mixed", new VariableInfo(Type.createTypeWithName("mixed", typeScope))],
    ["never", new VariableInfo(Type.createTypeWithName("never", typeScope))],
    ["void", new VariableInfo(Type.createTypeWithName("void", typeScope))],
    [
      "undefined",
      new VariableInfo(
        Type.createTypeWithName("undefined", typeScope, {
          isSubtypeOf: Type.createTypeWithName("void", typeScope)
        })
      )
    ],
    [
      "null",
      new VariableInfo(
        Type.createTypeWithName(null, typeScope, {
          isSubtypeOf: Type.createTypeWithName("void", typeScope)
        })
      )
    ],
    ["number", new VariableInfo(Type.createTypeWithName("number", typeScope))],
    ["bigint", new VariableInfo(Type.createTypeWithName("bigint", typeScope))],
    ["string", new VariableInfo(Type.createTypeWithName("string", typeScope))],
    ["boolean", new VariableInfo(Type.createTypeWithName("boolean", typeScope))]
  ];
  const globals = [["undefined", new VariableInfo(Type.createTypeWithName("undefined", typeScope))]];
  typeScope.body = new Map(globalTypes.concat([...typeScope.body]));
  moduleScope.body = new Map(globals.concat([...moduleScope.body]));
};

export default mixBaseGlobals;
