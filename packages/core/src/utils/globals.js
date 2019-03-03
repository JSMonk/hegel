import { Meta } from "../type-graph/meta/meta";
import { Type } from "../type-graph/types/type";
import { Scope } from "../type-graph/scope";
import { TypeVar } from "../type-graph/types/type-var";
import { UnionType } from "../type-graph/types/union-type";
import { ObjectType } from "../type-graph/types/object-type";
import { TYPE_SCOPE } from "../type-graph/constants";
import { GenericType } from "../type-graph/types/generic-type";
import { ModuleScope } from "../type-graph/module-scope";
import { FunctionType } from "../type-graph/types/function-type";
import { VariableInfo } from "../type-graph/variable-info";
import { CollectionType } from "../type-graph/types/collection-type";
import { findVariableInfo } from "./variable-utils";

const zeroMetaLocation = new Meta();

const genericType = (name, typeScope, genericArguments, typeFactory) => {
  const localTypeScope = new Scope(Scope.BLOCK_TYPE, typeScope);
  genericArguments.forEach(([key, type]) => {
    localTypeScope.body.set(key, new VariableInfo(type, localTypeScope));
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
  const globalTypes = new Map([
    ["mixed", new VariableInfo(Type.createTypeWithName("mixed", typeScope))],
    ["void", new VariableInfo(Type.createTypeWithName("void", typeScope))],
    [
      "undefined",
      new VariableInfo(
        Type.createTypeWithName("undefined", typeScope, {
          isLiteralOf: Type.createTypeWithName("void", typeScope)
        })
      )
    ],
    [
      null,
      new VariableInfo(
        Type.createTypeWithName(null, typeScope, {
          isLiteralOf: Type.createTypeWithName("void", typeScope)
        })
      )
    ],
    ["number", new VariableInfo(Type.createTypeWithName("number", typeScope))],
    ["string", new VariableInfo(Type.createTypeWithName("string", typeScope))],
    [
      "boolean",
      new VariableInfo(Type.createTypeWithName("boolean", typeScope))
    ],
    ["Symbol", new VariableInfo(Type.createTypeWithName("Symbol", typeScope))],
    [
      "SyntaxError",
      new VariableInfo(
        ObjectType.createTypeWithName("{ message: string }", typeScope, [
          [
            "message",
            new VariableInfo(Type.createTypeWithName("string", typeScope))
          ]
        ])
      )
    ],
    [
      "RegExp",
      new VariableInfo(ObjectType.createTypeWithName("RegExp", typeScope, []))
    ],
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
  typeScope.body = new Map([...typeScope.body, ...globalTypes]);
  const globals = new Map([
    [
      "undefined",
      new VariableInfo(Type.createTypeWithName("undefined", typeScope))
    ],
    [null, new VariableInfo(Type.createTypeWithName(null, typeScope))],
    [
      "Error",
      new VariableInfo(
        FunctionType.createTypeWithName(
          "(string) => { message: string }",
          typeScope,
          [Type.createTypeWithName("string", typeScope)],
          typeScope.body.get("SyntaxError").type
        )
      )
    ],
    [
      "SyntaxError",
      new VariableInfo(
        FunctionType.createTypeWithName(
          "(string) => { message: string }",
          typeScope,
          [Type.createTypeWithName("string", typeScope)],
          typeScope.body.get("SyntaxError").type
        )
      )
    ]
  ]);
  moduleScope.body = new Map([...moduleScope.body, ...globals]);
};

export default mixBaseGlobals;
