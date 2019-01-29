import {
  Type,
  Meta,
  ObjectType,
  ModuleScope,
  VariableInfo,
  ZeroLocation,
  TYPE_SCOPE
} from "../type/types";

const zeroMetaLocation = new Meta(ZeroLocation);

const mixBaseGlobals = moduleScope => {
  const typeScope = moduleScope.body.get(TYPE_SCOPE);
  const globals = new Map([
    [
      "undefined",
      new VariableInfo(Type.createTypeWithName("undefined", typeScope))
    ],
    ["Symbol", new VariableInfo(Type.createTypeWithName("Symbol", typeScope))]
  ]);
  moduleScope.body = new Map([...moduleScope.body, ...globals]);
};

export default mixBaseGlobals;
