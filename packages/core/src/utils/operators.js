import { Meta } from "../type-graph/meta/meta";
import { Type } from "../type-graph/types/type";
import { Scope } from "../type-graph/scope";
import { TypeVar } from "../type-graph/types/type-var";
import { UnionType } from "../type-graph/types/union-type";
import { ObjectType } from "../type-graph/types/object-type";
import { TYPE_SCOPE } from "../type-graph/constants";
import { GenericType } from "../type-graph/types/generic-type";
import { ModuleScope } from "../type-graph/module-scope";
import { $BottomType } from "../type-graph/types/bottom-type";
import { FunctionType } from "../type-graph/types/function-type";
import { VariableInfo } from "../type-graph/variable-info";
import { findVariableInfo } from "./variable-utils";

const zeroMetaLocation = new Meta();

export const genericFunction = (
  typeScope,
  genericArguments,
  getTypeParameters,
  getReturnType
) => {
  const localTypeScope = new Scope(Scope.BLOCK_TYPE, typeScope);
  genericArguments.forEach(([key, type]) => {
    localTypeScope.body.set(key, new VariableInfo(type, localTypeScope));
  });
  genericArguments = genericArguments.map(([, t]) =>
    Object.assign(t, { isUserDefined: true })
  );
  const parametersTypes = getTypeParameters(localTypeScope);
  const returnType = getReturnType(localTypeScope);
  return GenericType.createTypeWithName(
    FunctionType.getName(parametersTypes, returnType, genericArguments),
    typeScope,
    genericArguments,
    localTypeScope,
    FunctionType.createTypeWithName(
      FunctionType.getName(parametersTypes, returnType),
      localTypeScope,
      parametersTypes,
      returnType
    )
  );
};

const mixBaseOperators = moduleScope => {
  const typeScope = moduleScope.body.get(TYPE_SCOPE);
  const operators = new Map(
    [
      [
        "+",
        FunctionType.createTypeWithName(
          "(mixed) => number",
          typeScope,
          [Type.createTypeWithName("mixed", typeScope)],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "-",
        FunctionType.createTypeWithName(
          "(mixed) => number",
          typeScope,
          [Type.createTypeWithName("mixed", typeScope)],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "!",
        FunctionType.createTypeWithName(
          "(mixed) => boolean",
          typeScope,
          [Type.createTypeWithName("mixed", typeScope)],
          Type.createTypeWithName("boolean", typeScope)
        )
      ],
      [
        "~",
        genericFunction(
          typeScope,
          [
            [
              "T",
              new TypeVar(
                "T",
                new UnionType("bigint | number | string", [
                  new Type("bigint"),
                  new Type("number"),
                  new Type("string")
                ])
              )
            ]
          ],
          l => [l.body.get("T").type],
          l => l.body.get("T").type
        )
      ],
      [
        "typeof",
        FunctionType.createTypeWithName(
          '(mixed) => "string" | "boolean" | "number" | "function" | "object" | "undefined" | "symbol" | "bigint"',
          typeScope,
          [Type.createTypeWithName("mixed", typeScope)],
          UnionType.createTypeWithName(
            "'string' | 'boolean' | 'number' | 'function' | 'object' | 'undefined' | 'symbol' | 'bigint'",
            typeScope,
            [
              Type.createTypeWithName("'string'", typeScope, {
                isSubtypeOf: Type.createTypeWithName("string", typeScope)
              }),
              Type.createTypeWithName("'number'", typeScope, {
                isSubtypeOf: Type.createTypeWithName("string", typeScope)
              }),
              Type.createTypeWithName("'boolean'", typeScope, {
                isSubtypeOf: Type.createTypeWithName("string", typeScope)
              }),
              Type.createTypeWithName("'undefined'", typeScope, {
                isSubtypeOf: Type.createTypeWithName("string", typeScope)
              }),
              Type.createTypeWithName("'object'", typeScope, {
                isSubtypeOf: Type.createTypeWithName("string", typeScope)
              }),
              Type.createTypeWithName("'bigint'", typeScope, {
                isSubtypeOf: Type.createTypeWithName("string", typeScope)
              }),
              Type.createTypeWithName("'symbol'", typeScope, {
                isSubtypeOf: Type.createTypeWithName("string", typeScope)
              }),
              Type.createTypeWithName("'function'", typeScope, {
                isSubtypeOf: Type.createTypeWithName("string", typeScope)
              })
            ]
          )
        )
      ],
      [
        "void",
        FunctionType.createTypeWithName(
          "(mixed) => undefined",
          typeScope,
          [Type.createTypeWithName("mixed", typeScope)],
          Type.createTypeWithName("string", typeScope)
        )
      ],
      [
        "delete",
        FunctionType.createTypeWithName(
          "(mixed) => undefined",
          typeScope,
          [Type.createTypeWithName("mixed", typeScope)],
          Type.createTypeWithName("undefined", typeScope)
        )
      ],
      [
        "await",
        genericFunction(
          typeScope,
          [["T", new TypeVar("T")]],
          l => [
            new $BottomType(typeScope.body.get("Promise").type, [
              l.body.get("T").type
            ])
          ],
          l => l.body.get("T").type
        )
      ],
      [
        "==",
        FunctionType.createTypeWithName(
          "(mixed, mixed) => boolean",
          typeScope,
          [
            Type.createTypeWithName("mixed", typeScope),
            Type.createTypeWithName("mixed", typeScope)
          ],
          Type.createTypeWithName("boolean", typeScope)
        )
      ],
      [
        "===",
        FunctionType.createTypeWithName(
          "(mixed, mixed) => boolean",
          typeScope,
          [
            Type.createTypeWithName("mixed", typeScope),
            Type.createTypeWithName("mixed", typeScope)
          ],
          Type.createTypeWithName("boolean", typeScope)
        )
      ],
      [
        "!==",
        FunctionType.createTypeWithName(
          "(mixed, mixed) => boolean",
          typeScope,
          [
            Type.createTypeWithName("mixed", typeScope),
            Type.createTypeWithName("mixed", typeScope)
          ],
          Type.createTypeWithName("boolean", typeScope)
        )
      ],
      [
        "!=",
        FunctionType.createTypeWithName(
          "(mixed, mixed) => boolean",
          typeScope,
          [
            Type.createTypeWithName("mixed", typeScope),
            Type.createTypeWithName("mixed", typeScope)
          ],
          Type.createTypeWithName("boolean", typeScope)
        )
      ],
      [
        ">=",
        genericFunction(
          typeScope,
          [
            [
              "T",
              new TypeVar(
                "T",
                new UnionType("bigint | number | string", [
                  new Type("bigint"),
                  new Type("number"),
                  new Type("string")
                ])
              )
            ]
          ],
          l => [l.body.get("T").type, l.body.get("T").type],
          l => Type.createTypeWithName("boolean", l)
        )
      ],
      [
        "<=",
        genericFunction(
          typeScope,
          [
            [
              "T",
              new TypeVar(
                "T",
                new UnionType("bigint | number | string", [
                  new Type("bigint"),
                  new Type("number"),
                  new Type("string")
                ])
              )
            ]
          ],
          l => [l.body.get("T").type, l.body.get("T").type],
          l => Type.createTypeWithName("boolean", l)
        )
      ],
      [
        ">",
        genericFunction(
          typeScope,
          [
            [
              "T",
              new TypeVar(
                "T",
                new UnionType("bigint | number | string", [
                  new Type("bigint"),
                  new Type("number"),
                  new Type("string")
                ])
              )
            ]
          ],
          l => [l.body.get("T").type, l.body.get("T").type],
          l => Type.createTypeWithName("boolean", l)
        )
      ],
      [
        "<",
        genericFunction(
          typeScope,
          [
            [
              "T",
              new TypeVar(
                "T",
                new UnionType("bigint | number | string", [
                  new Type("bigint"),
                  new Type("number"),
                  new Type("string")
                ])
              )
            ]
          ],
          l => [l.body.get("T").type, l.body.get("T").type],
          l => Type.createTypeWithName("boolean", l)
        )
      ],
      [
        "b+",
        genericFunction(
          typeScope,
          [
            [
              "T",
              new TypeVar(
                "T",
                new UnionType("bigint | number | string", [
                  new Type("bigint"),
                  new Type("number"),
                  new Type("string")
                ])
              )
            ]
          ],
          l => [l.body.get("T").type, l.body.get("T").type],
          l => l.body.get("T").type
        )
      ],
      [
        "-",
        genericFunction(
          typeScope,
          [
            [
              "T",
              new TypeVar(
                "T",
                new UnionType("bigint | number", [
                  new Type("bigint"),
                  new Type("number")
                ])
              )
            ]
          ],
          l => [l.body.get("T").type, l.body.get("T").type],
          l => l.body.get("T").type
        )
      ],
      [
        "/",
        genericFunction(
          typeScope,
          [
            [
              "T",
              new TypeVar(
                "T",
                new UnionType("bigint | number", [
                  new Type("bigint"),
                  new Type("number")
                ])
              )
            ]
          ],
          l => [l.body.get("T").type, l.body.get("T").type],
          l => l.body.get("T").type
        )
      ],
      [
        "%",
        genericFunction(
          typeScope,
          [
            [
              "T",
              new TypeVar(
                "T",
                new UnionType("bigint | number", [
                  new Type("bigint"),
                  new Type("number")
                ])
              )
            ]
          ],
          l => [l.body.get("T").type, l.body.get("T").type],
          l => l.body.get("T").type
        )
      ],
      [
        "|",
        genericFunction(
          typeScope,
          [
            [
              "T",
              new TypeVar(
                "T",
                new UnionType("bigint | number", [
                  new Type("bigint"),
                  new Type("number")
                ])
              )
            ]
          ],
          l => [l.body.get("T").type, l.body.get("T").type],
          l => l.body.get("T").type
        )
      ],
      [
        "&",
        genericFunction(
          typeScope,
          [
            [
              "T",
              new TypeVar(
                "T",
                new UnionType("bigint | number", [
                  new Type("bigint"),
                  new Type("number")
                ])
              )
            ]
          ],
          l => [l.body.get("T").type, l.body.get("T").type],
          l => l.body.get("T").type
        )
      ],
      [
        "*",
        genericFunction(
          typeScope,
          [
            [
              "T",
              new TypeVar(
                "T",
                new UnionType("bigint | number", [
                  new Type("bigint"),
                  new Type("number")
                ])
              )
            ]
          ],
          l => [l.body.get("T").type, l.body.get("T").type],
          l => l.body.get("T").type
        )
      ],
      [
        "^",
        genericFunction(
          typeScope,
          [
            [
              "T",
              new TypeVar(
                "T",
                new UnionType("bigint | number", [
                  new Type("bigint"),
                  new Type("number")
                ])
              )
            ]
          ],
          l => [l.body.get("T").type, l.body.get("T").type],
          l => l.body.get("T").type
        )
      ],
      [
        "**",
        genericFunction(
          typeScope,
          [
            [
              "T",
              new TypeVar(
                "T",
                new UnionType("bigint | number", [
                  new Type("bigint"),
                  new Type("number")
                ])
              )
            ]
          ],
          l => [l.body.get("T").type, l.body.get("T").type],
          l => l.body.get("T").type
        )
      ],
      [
        "<<",
        genericFunction(
          typeScope,
          [
            [
              "T",
              new TypeVar(
                "T",
                new UnionType("bigint | number", [
                  new Type("bigint"),
                  new Type("number")
                ])
              )
            ]
          ],
          l => [l.body.get("T").type, l.body.get("T").type],
          l => l.body.get("T").type
        )
      ],
      [
        ">>",
        genericFunction(
          typeScope,
          [
            [
              "T",
              new TypeVar(
                "T",
                new UnionType("bigint | number", [
                  new Type("bigint"),
                  new Type("number")
                ])
              )
            ]
          ],
          l => [l.body.get("T").type, l.body.get("T").type],
          l => l.body.get("T").type
        )
      ],
      [
        ">>>",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "in",
        FunctionType.createTypeWithName(
          "(string, Object) => boolean",
          typeScope,
          [
            Type.createTypeWithName("string", typeScope),
            Type.createTypeWithName("Object", typeScope)
          ],
          Type.createTypeWithName("boolean", typeScope)
        )
      ],
      [
        "instanceof",
        FunctionType.createTypeWithName(
          "(mixed, mixed) => boolean",
          typeScope,
          [
            Type.createTypeWithName("mixed", typeScope),
            Type.createTypeWithName("mixed", typeScope)
          ],
          Type.createTypeWithName("boolean", typeScope)
        )
      ],
      [
        "=",
        genericFunction(
          typeScope,
          [["T", new TypeVar("T")]],
          l => [l.body.get("T").type, l.body.get("T").type],
          l => l.body.get("T").type
        )
      ],
      [
        "+=",
        genericFunction(
          typeScope,
          [
            [
              "T",
              new TypeVar(
                "T",
                new UnionType("number | string", [
                  new Type("number"),
                  new Type("string")
                ])
              )
            ]
          ],
          l => [l.body.get("T").type, l.body.get("T").type],
          l => l.body.get("T").type
        )
      ],
      [
        "-=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "*=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "/=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "%=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "**=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        ">>=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        ">>>=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "<<=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "|=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "&=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      // Updates
      [
        "++",
        FunctionType.createTypeWithName(
          "(number) => number",
          typeScope,
          [Type.createTypeWithName("number", typeScope)],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "--",
        FunctionType.createTypeWithName(
          "(number) => number",
          typeScope,
          [Type.createTypeWithName("number", typeScope)],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        // Logical
        "&&",
        genericFunction(
          typeScope,
          [["A", new TypeVar("A")], ["B", new TypeVar("B")]],
          l => [l.body.get("A").type, l.body.get("B").type],
          l =>
            UnionType.createTypeWithName("A | B", l, [
              l.body.get("A").type,
              l.body.get("B").type
            ])
        )
      ],
      [
        "||",
        genericFunction(
          typeScope,
          [["A", new TypeVar("A")], ["B", new TypeVar("B")]],
          l => [l.body.get("A").type, l.body.get("B").type],
          l =>
            UnionType.createTypeWithName("A | B", l, [
              l.body.get("A").type,
              l.body.get("B").type
            ])
        )
      ],
      [
        "?:",
        genericFunction(
          typeScope,
          [["A", new TypeVar("A")], ["B", new TypeVar("B")]],
          l => [
            Type.createTypeWithName("boolean", typeScope),
            l.body.get("A").type,
            l.body.get("B").type
          ],
          l =>
            UnionType.createTypeWithName("A | B", l, [
              l.body.get("A").type,
              l.body.get("B").type
            ])
        )
      ],
      [
        "if",
        FunctionType.createTypeWithName(
          "(boolean) => void",
          typeScope,
          [Type.createTypeWithName("boolean", typeScope)],
          Type.createTypeWithName("void", typeScope)
        )
      ],
      [
        "while",
        FunctionType.createTypeWithName(
          "(boolean) => void",
          typeScope,
          [Type.createTypeWithName("boolean", typeScope)],
          Type.createTypeWithName("void", typeScope)
        )
      ],
      [
        "do-while",
        FunctionType.createTypeWithName(
          "(boolean) => void",
          typeScope,
          [Type.createTypeWithName("boolean", typeScope)],
          Type.createTypeWithName("void", typeScope)
        )
      ],
      [
        "for",
        FunctionType.createTypeWithName(
          "(?mixed, ?boolean, ?mixed) => void",
          typeScope,
          [
            Type.createTypeWithName("mixed", typeScope),
            Type.createTypeWithName("boolean", typeScope),
            Type.createTypeWithName("mixed", typeScope)
          ],
          Type.createTypeWithName("void", typeScope)
        )
      ],
      [".", new $BottomType(typeScope.body.get("$PropertyType").type)],
      [
        "return",
        genericFunction(
          typeScope,
          [["T", new TypeVar("T")]],
          l => [l.body.get("T").type],
          l => l.body.get("T").type
        )
      ],
      [
        "new",
        genericFunction(
          typeScope,
          [["T", new TypeVar("T")]],
          l => [l.body.get("T").type],
          l => l.body.get("T").type
        )
      ],
      [
        "throw",
        genericFunction(
          typeScope,
          [["T", new TypeVar("T")]],
          l => [l.body.get("T").type],
          l => l.body.get("T").type
        )
      ]
    ].map(([name, type]) => [
      name,
      new VariableInfo(type, typeScope, zeroMetaLocation)
    ])
  );
  moduleScope.body = new Map([...moduleScope.body, ...operators]);
};

export default mixBaseOperators;
