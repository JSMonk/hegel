import { Meta } from "../type-graph/meta/meta";
import { Type } from "../type-graph/types/type";
import { TypeVar } from "../type-graph/types/type-var";
import { TypeScope } from "../type-graph/type-scope";
import { UnionType } from "../type-graph/types/union-type";
import { ObjectType } from "../type-graph/types/object-type";
import { GenericType } from "../type-graph/types/generic-type";
import { FunctionType } from "../type-graph/types/function-type";
import { VariableInfo } from "../type-graph/variable-info";
import { $AppliedStrictUnion } from "../type-graph/types/strict-union-type";

const zeroMetaLocation = new Meta();

export const genericFunction = (
  typeScope,
  getGenericArguments,
  getTypeParameters,
  getReturnType
) => {
  const localTypeScope = new TypeScope(
    typeScope,
    TypeScope.MODULE_SCOPE_PRIORITY + 1
  );
  let genericArguments = getGenericArguments(localTypeScope);
  genericArguments.forEach(([key, type]) => localTypeScope.body.set(key, type));
  genericArguments = genericArguments.map(([, t]) =>
    Object.assign(t, { isUserDefined: true })
  );
  const parametersTypes = getTypeParameters(localTypeScope);
  const returnType = getReturnType(localTypeScope);
  return GenericType.term(
    FunctionType.getName(parametersTypes, returnType, genericArguments),
    { parent: typeScope },
    genericArguments,
    localTypeScope,
    FunctionType.term(
      FunctionType.getName(parametersTypes, returnType),
      { parent: localTypeScope },
      parametersTypes,
      returnType
    )
  );
};

const mixBaseOperators = moduleScope => {
  const typeScope = moduleScope.typeScope;
  const operators = [
    [
      "+",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {}, 
                  UnionType.term(null, { parent: typeScope }, [
                    Type.BigInt,
                    Type.Number
                  ])
              )
            )
          ]
        ],
        l => [l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "-",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "!",
      FunctionType.term(
        "(boolean) => boolean",
        { parent: typeScope },
        [Type.Boolean],
        Type.Boolean
      )
    ],
    [
      "~",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "typeof",
      FunctionType.term(
        '(unknown) => "string" | "boolean" | "number" | "function" | "object" | "undefined" | "symbol" | "bigint"',
        { parent: typeScope },
        [Type.Unknown],
        UnionType.term(
          "'string' | 'boolean' | 'number' | 'function' | 'object' | 'undefined' | 'symbol' | 'bigint'",
          { parent: typeScope },
          [
            Type.term("'string'", { isSubtypeOf: Type.String }),
            Type.term("'number'", { isSubtypeOf: Type.String }),
            Type.term("'boolean'", { isSubtypeOf: Type.String }),
            Type.term("'undefined'", { isSubtypeOf: Type.String }),
            Type.term("'object'", { isSubtypeOf: Type.String }),
            Type.term("'bigint'", { isSubtypeOf: Type.String }),
            Type.term("'symbol'", { isSubtypeOf: Type.String }),
            Type.term("'function'", { isSubtypeOf: Type.String })
          ]
        )
      )
    ],
    [
      "void",
      FunctionType.term(
        "(unknown) => undefined",
        { parent: typeScope },
        [Type.Unknown],
        Type.Undefined
      )
    ],
    [
      "delete",
      FunctionType.term(
        "(unknown) => undefined",
        { parent: typeScope },
        [Type.Unknown],
        Type.Undefined
      )
    ],
    typeScope.body.has("Promise")
      ? [
          "await",
          genericFunction(
            typeScope,
            parent => {
              const V = TypeVar.term("V", { parent });
              return [
                ["V", V],
                [
                  "T",
                  TypeVar.term(
                    "T",
                    { parent },
                    Type.find("Thenable").applyGeneric([V])
                  )
                ]
              ];
            },
            l => [l.body.get("T")],
            l => l.body.get("V")
          )
        ]
      : [
          "await",
          FunctionType.term(
            "(unknown) => unknown",
            { parent: typeScope },
            [Type.Unknown],
            Type.Unknown
          )
        ],
    [
      "==",
      FunctionType.term(
        "(unknown, unknown) => boolean",
        { parent: typeScope },
        [Type.Unknown, Type.Unknown],
        Type.Boolean
      )
    ],
    [
      "===",
      genericFunction(
        typeScope,
        parent => [["T", TypeVar.term("T", { parent })]],
        l => [l.body.get("T"), l.body.get("T")],
        l => Type.Boolean
      )
    ],
    [
      "!==",
      genericFunction(
        typeScope,
        parent => [["T", TypeVar.term("T", { parent })]],
        l => [l.body.get("T"), l.body.get("T")],
        l => Type.Boolean
      )
    ],
    [
      "!=",
      FunctionType.term(
        "(unknown, unknown) => boolean",
        { parent: typeScope },
        [Type.Unknown, Type.Unknown],
        Type.Boolean
      )
    ],
    [
      ">=",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        _ => Type.Boolean
      )
    ],
    [
      "<=",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        _ => Type.Boolean
      )
    ],
    [
      ">",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        _ => Type.Boolean
      )
    ],
    [
      "<",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        _ => Type.Boolean
      )
    ],
    [
      "b+",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.String,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "b-",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "/",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "%",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "|",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "&",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "*",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "^",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "**",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "<<",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      ">>",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      ">>>",
      FunctionType.term(
        "(number, number) => number",
        { parent: typeScope },
        [Type.Number, Type.Number],
        Type.Number
      )
    ],
    [
      "in",
      genericFunction(
        typeScope,
        parent => [["T", TypeVar.term("T", { parent }, ObjectType.Object)]],
        l => [Type.String, l.body.get("T")],
        l => Type.Boolean
      )
    ],
    [
      "instanceof",
      FunctionType.term(
        "(unknown, unknown) => boolean",
        { parent: typeScope },
        [Type.Unknown, Type.Unknown],
        Type.Boolean
      )
    ],
    [
      "=",
      genericFunction(
        typeScope,
        parent => [["T", TypeVar.term("T", { parent })]],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "+=",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.String,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "-=",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "*=",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "/=",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "%=",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "**=",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      ">>=",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      ">>>=",
      FunctionType.term(
        "(number, number) => number",
        { parent: typeScope },
        [Type.Number, Type.Number],
        Type.Number
      )
    ],
    [
      "<<=",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "|=",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "&=",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              $AppliedStrictUnion.term(
                null, 
                {},
                UnionType.term(null, { parent: typeScope }, [
                  Type.BigInt,
                  Type.Number
                ])
              )
            )
          ]
        ],
        l => [l.body.get("T"), l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    // Updates
    [
      "++",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              UnionType.term("bigint | number", {}, [Type.BigInt, Type.Number])
            )
          ]
        ],
        l => [l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "--",
      genericFunction(
        typeScope,
        parent => [
          [
            "T",
            TypeVar.term(
              "T",
              { parent },
              UnionType.term("bigint | number", {}, [Type.BigInt, Type.Number])
            )
          ]
        ],
        l => [l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      // Logical
      "&&",
      genericFunction(
        typeScope,
        parent => [
          ["A", TypeVar.term("A", { parent })],
          ["B", TypeVar.term("B", { parent })]
        ],
        l => [l.body.get("A"), l.body.get("B")],
        l =>
          UnionType.term("A | B", { parent: l }, [
            l.body.get("A"),
            l.body.get("B")
          ])
      )
    ],
    [
      "||",
      genericFunction(
        typeScope,
        parent => [
          ["A", TypeVar.term("A", { parent })],
          ["B", TypeVar.term("B", { parent })]
        ],
        l => [l.body.get("A"), l.body.get("B")],
        l =>
          UnionType.term("A | B", { parent: l }, [
            l.body.get("A"),
            l.body.get("B")
          ])
      )
    ],
    [
      "?:",
      genericFunction(
        typeScope,
        parent => [
          ["A", TypeVar.term("A", { parent })],
          ["B", TypeVar.term("B", { parent })]
        ],
        l => [Type.Boolean, l.body.get("A"), l.body.get("B")],
        l =>
          UnionType.term("A | B", { parent: l }, [
            l.body.get("A"),
            l.body.get("B")
          ])
      )
    ],
    [
      "if",
      FunctionType.term(
        "(boolean) => void",
        { parent: typeScope },
        [Type.Boolean],
        Type.Undefined
      )
    ],
    [
      "while",
      FunctionType.term(
        "(boolean) => void",
        { parent: typeScope },
        [Type.Boolean],
        Type.Undefined
      )
    ],
    [
      "do-while",
      FunctionType.term(
        "(boolean) => void",
        { parent: typeScope },
        [Type.Boolean],
        Type.Undefined
      )
    ],
    [
      "for",
      FunctionType.term(
        "(?unknown, ?boolean, ?unknown) => void",
        { parent: typeScope },
        [
          UnionType.term("undefined | unknown", {}, [
            Type.Undefined,
            Type.Unknown
          ]),
          UnionType.term("boolean | undefined", {}, [
            Type.Boolean,
            Type.Undefined
          ]),
          UnionType.term("undefined | unknown", {}, [
            Type.Undefined,
            Type.Unknown
          ])
        ],
        Type.Undefined
      )
    ],
    [
      "return",
      genericFunction(
        typeScope,
        parent => [["T", TypeVar.term("T", { parent })]],
        l => [l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "new",
      genericFunction(
        typeScope,
        parent => [["T", TypeVar.term("T", { parent })]],
        l => [l.body.get("T")],
        l => l.body.get("T")
      )
    ],
    [
      "throw",
      genericFunction(
        typeScope,
        parent => [["T", TypeVar.term("T", { parent })]],
        l => [l.body.get("T")],
        l => l.body.get("T")
      )
    ]
  ].forEach(([name, type]) =>
    moduleScope.body.set(
      name,
      new VariableInfo(type, moduleScope, zeroMetaLocation)
    )
  );
};

export default mixBaseOperators;
