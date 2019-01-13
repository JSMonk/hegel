import { FunctionType, VariableInfo, ModuleScope } from "../type/types";

const operatorModuleScope = new ModuleScope();

const nullLocation = {
  start: { line: 0, column: 0 },
  end: { line: 0, column: 0 }
};

const operators = new Map([
  [
    "+",
    new VariableInfo(
      new FunctionType(
        "(mixed) => number",
        [new Type("mixed")],
        new Type("number")
      ),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "-",
    new VariableInfo(
      new FunctionType(
        "(mixed) => number",
        [new Type("mixed")],
        new Type("number")
      ),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "!",
    new VariableInfo(
      new FunctionType(
        "(mixed) => boolean",
        [new Type("mixed")],
        new Type("boolean")
      ),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "~",
    new VariableInfo(
      new FunctionType(
        "(number) => number",
        [new Type("number")],
        new Type("number")
      ),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "typeof",
    new VariableInfo(
      new FunctionType(
        "(mixed) => string",
        [new Type("mixed")],
        new Type("string")
      ),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "void",
    new VariableInfo(
      new FunctionType(
        "(mixed) => undefined",
        [new Type("mixed")],
        new Type("string")
      ),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "delete",
    new VariableInfo(
      new FunctionType(
        "(mixed) => undefined",
        [new Type("mixed")],
        new Type("undefined")
      ),
      operatorModuleScope,
      nullLocation
    )
  ],
  // ["await", new VariableInfo(new FunctionType("<T>(Promise<T>) => <T>", operatorModuleScope, nullLocation))],
  // Binary
  // [
  //   "==",
  //   new VariableInfo(
  //     new FunctionType("<T>(T, T) => boolean", [new Type("T"), new Type("T")], new Type("boolean")),
  //     operatorModuleScope,
  //     nullLocation
  //   )
  // ],
  // [
  //   "===",
  //   new VariableInfo(
  //     new FunctionType("<T>(T, T) => boolean", [new Type("T"), new Type("T")], new Type("boolean")),
  //     operatorModuleScope,
  //     nullLocation
  //   )
  // ],
  // [
  //   "!==",
  //   new VariableInfo(
  //     new FunctionType("<T>(T, T) => boolean", [new Type("T"), new Type("T")], new Type("boolean")),
  //     operatorModuleScope,
  //     nullLocation
  //   )
  // ],
  // [
  //   "!=",
  //   new VariableInfo(
  //     new FunctionType("<T>(T, T) => boolean", [new Type("T"), new Type("T")], new Type("boolean")),
  //     operatorModuleScope,
  //     nullLocation
  //   )
  // ],
  // [
  //   ">=",
  //   new VariableInfo(
  //     new FunctionType("<T: number | string>(T, T) => boolean", [new Type("T"), new Type("T")], new Type("boolean")),
  //     operatorModuleScope,
  //     nullLocation
  //   )
  // ],
  // [
  //   "<=",
  //   new VariableInfo(
  //     new FunctionType("<T: number | string>(T, T) => boolean", [new Type("T"), new Type("T")], new Type("boolean")),
  //     operatorModuleScope,
  //     nullLocation
  //   )
  // ],
  // [
  //   ">",
  //   new VariableInfo(
  //     new FunctionType("<T: number | string>(T, T) => boolean", [new Type("T"), new Type("T")], new Type("boolean")),
  //     operatorModuleScope,
  //     nullLocation
  //   )
  // ],
  // [
  //   "<",
  //   new VariableInfo(
  //     new FunctionType("<T: number | string>(T, T) => boolean", [new Type("T"), new Type("T")], new Type("boolean")),
  //     operatorModuleScope,
  //     nullLocation
  //   )
  // ],
  // [
  //   "+",
  //   new VariableInfo(
  //     new FunctionType("<T: string | number>(T, T) => T", [new Type("T"), new Type("T")], new Type("boolean")),
  //     operatorModuleScope,
  //     nullLocation
  //   )
  // ],
  [
    "-",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "/",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "%",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "|",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "&",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "^",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "**",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "<<",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    ">>",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    ">>>",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  // [
  //   "in",
  //   new VariableInfo(
  //     new FunctionType("(string, object | Array<mixed>) => boolean", [new Type("number"), new Type("number")], new Type("number")),
  //     operatorModuleScope,
  //     nullLocation
  //   )
  // ],
  [
    "instanceof",
    new VariableInfo(
      new FunctionType("(mixed, mixed) => boolean", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  // Assignment
  // [
  //   "=",
  //   new VariableInfo(
  //     new FunctionType("<T>(T, T) => T", [new Type("T"), new Type("T")], new Type("T")),
  //     operatorModuleScope,
  //     nullLocation
  //   )
  // ],
  // [
  //   "+=",
  //   new VariableInfo(
  //     new FunctionType("<T: string | number>(T, T) => T", [new Type("T"), new Type("T")], new Type("T")),
  //     operatorModuleScope,
  //     nullLocation
  //   )
  // ],
  [
    "-=",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "*=",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "/=",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "%=",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "**=",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    ">>=",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    ">>>=",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "<<=",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "|=",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "&=",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  // Updates
  [
    "++",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  [
    "--",
    new VariableInfo(
      new FunctionType("(number, number) => number", [new Type("number"), new Type("number")], new Type("number")),
      operatorModuleScope,
      nullLocation
    )
  ],
  // Logical
  // [
  //   "&&",
  //   new VariableInfo(
  //     new FunctionType("<A>(A, A) => A", [new Type("A"), new Type("A")], new Type("A")),
  //     operatorModuleScope,
  //     nullLocation
  //   )
  // ],
  // [
  //   "||",
  //   new VariableInfo(
  //     new FunctionType("<A>(A, A) => A", [new Type("A"), new Type("A")], new Type("A")),
  //     operatorModuleScope,
  //     nullLocation
  //   )
  // ],
  // Conditional
  // [
  //   "?:",
  //   new VariableInfo(
  //     new FunctionType("<A>(boolean, A, A) => A", [new Type("A"), new Type("A")], new Type("A")),
  //     operatorModuleScope,
  //     nullLocation
  //   )
  // ],
]);

operatorModuleScope.body = operators;

export default operatorModuleScope;
