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
import { genericFunction } from "./operators";
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
      null,
      new VariableInfo(
        Type.createTypeWithName(null, typeScope, {
          isSubtypeOf: Type.createTypeWithName("void", typeScope)
        })
      )
    ],
    ["number", new VariableInfo(Type.createTypeWithName("number", typeScope))],
    ["bigint", new VariableInfo(Type.createTypeWithName("bigint", typeScope))],
    ["string", new VariableInfo(Type.createTypeWithName("string", typeScope))],
    [
      "boolean",
      new VariableInfo(Type.createTypeWithName("boolean", typeScope))
    ],
    [
      "Function",
      new VariableInfo(ObjectType.createTypeWithName("Function", typeScope, []))
    ],
    [
      "Object",
      new VariableInfo(ObjectType.createTypeWithName("Object", typeScope, []))
    ],
    [
      "function",
      new VariableInfo(ObjectType.createTypeWithName("Function", typeScope, []))
    ],
    [
      "object",
      new VariableInfo(ObjectType.createTypeWithName("Object", typeScope, []))
    ],
    [
      "Object",
      new VariableInfo(ObjectType.createTypeWithName("Function", typeScope, []))
    ],
    ["Symbol", new VariableInfo(Type.createTypeWithName("Symbol", typeScope))],
    [
      "Number",
      new VariableInfo(ObjectType.createTypeWithName("Number", typeScope, []))
    ],
    [
      "String",
      new VariableInfo(ObjectType.createTypeWithName("String", typeScope, []))
    ],
    [
      "Boolean",
      new VariableInfo(ObjectType.createTypeWithName("String", typeScope, []))
    ],
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
      "Promise",
      new VariableInfo(
        genericType(
          "Promise",
          typeScope,
          [["T", new TypeVar("T")]],
          localTypeScope =>
            ObjectType.createTypeWithName("Promise", typeScope, [])
        )
      )
    ],
    [
      "Math",
      new VariableInfo(
        ObjectType.createTypeWithName("Math", typeScope, [
          [
            "random",
            new VariableInfo(
              FunctionType.createTypeWithName(
                "() => number",
                typeScope,
                [],
                Type.createTypeWithName("number", typeScope)
              )
            )
          ]
        ])
      )
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
              TypeVar.createTypeWithName("T", localTypeScope),
              {
                isSubtypeOf: ObjectType.createTypeWithName(
                  "Array.__proto__",
                  localTypeScope,
                  [
                    [
                      "find",
                      new VariableInfo(
                        FunctionType.createTypeWithName(
                          "<T>(T => boolean) => T | void",
                          localTypeScope,
                          [
                            FunctionType.createTypeWithName(
                              "<T>(T) => boolean",
                              localTypeScope,
                              [localTypeScope.body.get("T").type],
                              Type.createTypeWithName("boolean", typeScope)
                            )
                          ],
                          UnionType.createTypeWithName(
                            "T | void",
                            localTypeScope,
                            [
                              localTypeScope.body.get("T").type,
                              Type.createTypeWithName("void", typeScope)
                            ]
                          )
                        )
                      )
                    ]
                  ]
                )
              }
            )
        )
      )
    ],
    [
      "Uint32Array",
      new VariableInfo(
        CollectionType.createTypeWithName(
          "{ [key: number]: number }",
          localTypeScope,
          Type.createTypeWithName("number", localTypeScope),
          TypeVar.createTypeWithName("number", localTypeScope),
          {
            isSubtypeOf: ObjectType.createTypeWithName(
              "Array.__proto__",
              localTypeScope,
              [
                [
                  "slice",
                  new VariableInfo(
                    FunctionType.createTypeWithName(
                      "(number, number) => Uint32Array",
                      localTypeScope,
                      [
                        Type.createTypeWithName("number", localTypeScope),
                        Type.createTypeWithName("number", localTypeScope)
                      ],
                      Type.createTypeWithName("Uint32Array", localTypeScope)
                    )
                  )
                ]
              ]
            )
          }
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
      "Array",
      new VariableInfo(
        genericFunction(
          typeScope,
          [["T", new TypeVar("T")]],
          l => [l.body.get("T").type],
          l =>
            typeScope.body
              .get("Array")
              .type.applyGeneric([l.body.get("T").type])
        )
      )
    ],
    [
      "Uint32Array",
      new VariableInfo(
        FunctionType.createTypeWithName(
          "(number | Array<number>) => Uint32Array",
          typeScope,
          [
            UnionType.createTypeWithName("Array<number> | number", typeScope, [
              Type.createTypeWithName("number", typeScope),
              CollectionType.createTypeWithName(
                "Array",
                typeScope
              ).applyGeneric(Type.createTypeWithName("number", typeScope))
            ])
          ],
          CollectionType.createTypeWithName("Uint32Array", typeScope)
        )
      )
    ],
    ["Math", typeScope.body.get("Math")],
    [
      "Number",
      new VariableInfo(
        FunctionType.createTypeWithName(
          "(mixed) => number",
          typeScope,
          [Type.createTypeWithName("mixed", typeScope)],
          Type.createTypeWithName("number", typeScope)
        )
      )
    ],
    [
      "String",
      new VariableInfo(
        FunctionType.createTypeWithName(
          "(mixed) => string",
          typeScope,
          [Type.createTypeWithName("mixed", typeScope)],
          Type.createTypeWithName("string", typeScope)
        )
      )
    ],
    [
      "Boolean",
      new VariableInfo(
        FunctionType.createTypeWithName(
          "(mixed) => boolean",
          typeScope,
          [Type.createTypeWithName("mixed", typeScope)],
          Type.createTypeWithName("boolean", typeScope)
        )
      )
    ],
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
