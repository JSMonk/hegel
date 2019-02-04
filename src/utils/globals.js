import {
  Type,
  Meta,
  Scope,
  TypeVar,
  ObjectType,
  GenericType,
  ModuleScope,
  VariableInfo,
  ZeroLocation,
  CollectionType,
  TYPE_SCOPE
} from "../type/types";

const zeroMetaLocation = new Meta(ZeroLocation);

const genericType = (name, typeScope, genericArguments, typeFactory) => {
  const localTypeScope = new Scope(Scope.BLOCK_TYPE, typeScope);
  genericArguments.forEach(([key, type]) => {
    localTypeScope.body.set(
      key,
      new VariableInfo(type, localTypeScope, ZeroLocation)
    );
  });
  genericArguments = genericArguments.map(([, t]) => t);
  return GenericType.createTypeWithName(
    name,
    typeScope,
    genericArguments,
    localTypeScope,
    typeFactory(localTypeScope)
  );
};

const mixBaseGlobals = moduleScope => {
  const typeScope = moduleScope.body.get(TYPE_SCOPE);
  const globals = new Map([
    [
      "undefined",
      new VariableInfo(Type.createTypeWithName("undefined", typeScope))
    ],
    ["Symbol", new VariableInfo(Type.createTypeWithName("Symbol", typeScope))],
    [
      "Array",
      new VariableInfo(
        genericType(
          "{ [key: number]: T }",
          typeScope,
          [["T", new TypeVar("T")]],
          localTypeScope =>
            CollectionType.createTypeWithName(
              "{ [key: number]: T }",
              localTypeScope,
              Type.createTypeWithName("number", localTypeScope),
              TypeVar.createTypeWithName("T", localTypeScope)
            )
        )
      )
    ]
  ]);
  moduleScope.body = new Map([...moduleScope.body, ...globals]);
};

export default mixBaseGlobals;
