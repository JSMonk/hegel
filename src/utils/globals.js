import {
  Type,
  Meta,
  ObjectType,
  ModuleScope,
  VariableInfo,
  ZeroLocation
} from "../type/types";

const globalsModuleScope = new ModuleScope();

const zeroMetaLocation = new Meta(ZeroLocation);

const mixBaseGlobals = typeScope => {
  if (!globalsModuleScope.body.size) {
    const globals = new Map([
      [
        "undefined",
        new VariableInfo(new Type("undefined"), typeScope, zeroMetaLocation)
      ],
      [
        "Symbol",
        new VariableInfo(new Type("Symbol"), typeScope, zeroMetaLocation)
      ]
    ]);
    globalsModuleScope.body = globals;
  }
  typeScope.body = new Map([...typeScope.body, ...globalsModuleScope.body]);
  return globalsModuleScope;
};

export default mixBaseGlobals;
