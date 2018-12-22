const babylon = require("@babel/parser");
const createTypeGraph = require("../build/type/type-graph").default;
const { Type, TypeInfo, FunctionType } = require("../build/type/types");

const babelrc = {
  sourceType: "module",
  plugins: ["flow"]
};

const prepareAST = source => babylon.parse(source, babelrc).program;

describe("Simple global variable nodes", () => {
  test("Creating global module variable with number type", () => {
    const sourceAST = prepareAST(`
      const a: number = 2;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("number"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with string type", () => {
    const sourceAST = prepareAST(`
      const a: string = '2';
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("string"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with boolean type", () => {
    const sourceAST = prepareAST(`
      const a: boolean = false;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("boolean"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with void type", () => {
    const sourceAST = prepareAST(`
      const a: void = undefined;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("void"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with any type", () => {
    const sourceAST = prepareAST(`
      const a: any = 2;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("any"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with mixed type", () => {
    const sourceAST = prepareAST(`
      const a: mixed = 2;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("mixed"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with literal null type", () => {
    const sourceAST = prepareAST(`
      const a: null = null;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type(null, { isLiteral: true }),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with literal number type", () => {
    const sourceAST = prepareAST(`
      const a: 2 = 2;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type(2, { isLiteral: true }),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with literal string type", () => {
    const sourceAST = prepareAST(`
      const a: '2' = '2';
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("2", { isLiteral: true }),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with literal boolean type", () => {
    const sourceAST = prepareAST(`
      const a: false = false;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type(false, { isLiteral: true }),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with literal undefined type", () => {
    const sourceAST = prepareAST(`
      const a: undefined = undefined;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("undefined"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Create global module variable with other variable relation", () => {
    const sourceAST = prepareAST(`
      const a = 5;
      const b = a;
    `);
    const actual = createTypeGraph(sourceAST);
    const actualAVariable = actual.body.get("a");
    const actualBVariable = actual.body.get("b");
    const expectedBVariable = expect.objectContaining({
      parent: actual
    });
    expect(actualAVariable).not.toBeFalsy(undefined);
    expect(actualBVariable).toEqual(expectedBVariable);
    expect(actualBVariable.relatedTo).not.toBeFalsy(undefined);
    expect(actualBVariable.relatedTo.get("a")).toEqual(actualAVariable);
  });
  test("Create global module function declaration with return type", () => {
    const sourceAST = prepareAST(`
      function a(a, b): number {
        return 2;
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("a");
    const expectedAFunction = expect.objectContaining({
      parent: actual,
      type: new FunctionType(
        "(?, ?) => number",
        [new Type("?"), new Type("?")],
        new Type("number")
      )
    });
    expect(actualAFunction).toEqual(expectedAFunction);
  });
  test("Create global module function declaration with arguments types", () => {
    const sourceAST = prepareAST(`
      function a(a: number, b: string) {
        return 2;
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("a");
    const expectedAFunction = expect.objectContaining({
      parent: actual,
      type: new FunctionType(
        "(number, string) => ?",
        [new Type("number"), new Type("string")],
        new Type("?")
      )
    });
    expect(actualAFunction).toEqual(expectedAFunction);
  });
  test("Create global module function declaration with arguments and return types", () => {
    const sourceAST = prepareAST(`
      function a(a: number, b: string): number {
        return 2;
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("a");
    const expectedAFunction = expect.objectContaining({
      parent: actual,
      type: new FunctionType(
        "(number, string) => number",
        [new Type("number"), new Type("string")],
        new Type("number")
      )
    });
    expect(actualAFunction).toEqual(expectedAFunction);
  });
  test("Create global module function expression with return type", () => {
    const sourceAST = prepareAST(`
      const a = function(a, b): number {
        return 2;
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("a");
    const expectedAFunction = expect.objectContaining({
      parent: actual,
      type: new FunctionType(
        "(?, ?) => number",
        [new Type("?"), new Type("?")],
        new Type("number")
      )
    });
    expect(actualAFunction).toEqual(expectedAFunction);
  });
  test("Create global module function expression with arguments types", () => {
    const sourceAST = prepareAST(`
      const a = function(a: number, b: string) {
        return 2;
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("a");
    const expectedAFunction = expect.objectContaining({
      parent: actual,
      type: new FunctionType(
        "(number, string) => ?",
        [new Type("number"), new Type("string")],
        new Type("?")
      )
    });
    expect(actualAFunction).toEqual(expectedAFunction);
  });
  test("Create global module function expression with arguments and return types", () => {
    const sourceAST = prepareAST(`
      const a = function(a: number, b: string): number {
        return 2;
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("a");
    const expectedAFunction = expect.objectContaining({
      parent: actual,
      type: new FunctionType(
        "(number, string) => number",
        [new Type("number"), new Type("string")],
        new Type("number")
      )
    });
    expect(actualAFunction).toEqual(expectedAFunction);
  });
  test("Create global module function expression with return type near init", () => {
    const sourceAST = prepareAST(`
      const a: (number, number) => number = function(a, b) {
        return 2;
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("a");
    const expectedAFunction = expect.objectContaining({
      parent: actual,
      type: new FunctionType(
        "(number, number) => number",
        [new Type("number"), new Type("number")],
        new Type("number")
      )
    });
    expect(actualAFunction).toEqual(expectedAFunction);
  });
  test("Create global module arrow function expression with return type near init", () => {
    const sourceAST = prepareAST(`
      const a: (number, number) => number = (a, b) => 2;
    `);
    const actual = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("a");
    const expectedAFunction = expect.objectContaining({
      parent: actual,
      type: new FunctionType(
        "(number, number) => number",
        [new Type("number"), new Type("number")],
        new Type("number")
      )
    });
    expect(actualAFunction).toEqual(expectedAFunction);
  });
});

describe("Block scoped variables", () => {
  test("Global and block scopes", () => {
    const sourceAST = prepareAST(`
      const a: number = 1;
      {
        const a: string = '2';
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualScope = actual.body.get("[[Scope3-6]]");
    const expectedScope = expect.objectContaining({
      type: "block",
      parent: actual
    });
    const expectedVariable = expect.objectContaining({
      type: new Type("number"),
      parent: actual
    });
    const expectedScopedVariable = expect.objectContaining({
      type: new Type("string"),
      parent: actualScope
    });
    expect(actual.body.get("a")).toEqual(expectedVariable);
    expect(actualScope).toEqual(expectedScope);
    expect(actualScope.body.get("a")).toEqual(expectedScopedVariable);
  });
  test("Nested not global block scopes", () => {
    const sourceAST = prepareAST(`
      {
        const a: number = 1;
        {
          const a: string = '2';
        }
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualTopScope = actual.body.get("[[Scope2-6]]");
    const actualBottomScope = actual.body.get("[[Scope4-8]]");
    const expectedTopScope = expect.objectContaining({
      type: "block",
      parent: actual
    });
    const expectedTopScopedVariable = expect.objectContaining({
      type: new Type("number"),
      parent: actualTopScope
    });
    const expectedBottomScope = expect.objectContaining({
      type: "block",
      parent: actualTopScope
    });
    const expectedBottomScopedVariable = expect.objectContaining({
      type: new Type("string"),
      parent: actualBottomScope
    });
    expect(actualTopScope).toEqual(expectedTopScope);
    expect(actualTopScope.body.get("a")).toEqual(expectedTopScopedVariable);
    expect(actualBottomScope).toEqual(expectedBottomScope);
    expect(actualBottomScope.body.get("a")).toEqual(
      expectedBottomScopedVariable
    );
  });
  test("Sibling scopes", () => {
    const sourceAST = prepareAST(`
      {
        const a: number = 1;
      }
      {
        const a: string = '2';
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualTopScope = actual.body.get("[[Scope2-6]]");
    const actualBottomScope = actual.body.get("[[Scope5-6]]");
    const expectedTopScope = expect.objectContaining({
      type: "block",
      parent: actual
    });
    const expectedTopScopedVariable = expect.objectContaining({
      type: new Type("number"),
      parent: actualTopScope
    });
    const expectedBottomScope = expect.objectContaining({
      type: "block",
      parent: actual
    });
    const expectedBottomScopedVariable = expect.objectContaining({
      type: new Type("string"),
      parent: actualBottomScope
    });
    expect(actualTopScope).toEqual(expectedTopScope);
    expect(actualTopScope.body.get("a")).toEqual(expectedTopScopedVariable);
    expect(actualBottomScope).toEqual(expectedBottomScope);
    expect(actualBottomScope.body.get("a")).toEqual(
      expectedBottomScopedVariable
    );
  });
  test("Create nested variable with other variable relation", () => {
    const sourceAST = prepareAST(`
      const a = 5;
      {
        const b = a;
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualAVariable = actual.body.get("a");
    const actualBScope = actual.body.get("[[Scope3-6]]");
    const actualBVariable = actualBScope.body.get("b");
    const expectedBScope = expect.objectContaining({
      type: "block",
      parent: actual
    });
    const expectedBVariable = expect.objectContaining({
      parent: actualBScope
    });
    expect(actualAVariable).not.toEqual(undefined);
    expect(actualBScope).toEqual(expectedBScope);
    expect(actualBVariable).toEqual(expectedBVariable);
    expect(actualBVariable.relatedTo).not.toEqual(undefined);
    expect(actualBVariable.relatedTo.get("a")).toEqual(actualAVariable);
  });
  test("Create nested variable with 'var' kind", () => {
    const sourceAST = prepareAST(`
      {
        var b = 2;
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualBScope = actual.body.get("[[Scope2-6]]");
    const actualBVariable = actual.body.get("b");
    const actualScopedBVariable = actualBScope.body.get("b");
    const expectedBScope = expect.objectContaining({
      type: "block",
      parent: actual
    });
    const expectedBVariable = expect.objectContaining({
      parent: actual
    });
    expect(actualBScope).toEqual(expectedBScope);
    expect(actualScopedBVariable).toEqual(undefined);
    expect(actualBVariable).toEqual(expectedBVariable);
  });
});

describe("Operators scopes", () => {
  test("If operator scope", () => {
    const sourceAST = prepareAST(`
      if (true) {
        const a: number = 2;
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualScope = actual.body.get("[[Scope2-16]]");
    const expectedScope = expect.objectContaining({
      type: "block",
      parent: actual
    });
    const expectedVariable = expect.objectContaining({
      type: new Type("number"),
      parent: actualScope
    });
    expect(actualScope).toEqual(expectedScope);
    expect(actualScope.body.get("a")).toEqual(expectedVariable);
  });
  test("While operator scope", () => {
    const sourceAST = prepareAST(`
      while (true) {
        const a: number = 2;
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualScope = actual.body.get("[[Scope2-19]]");
    const expectedScope = expect.objectContaining({
      type: "block",
      parent: actual
    });
    const expectedVariable = expect.objectContaining({
      type: new Type("number"),
      parent: actualScope
    });
    expect(actualScope).toEqual(expectedScope);
    expect(actualScope.body.get("a")).toEqual(expectedVariable);
  });
  test("For operator scope", () => {
    const sourceAST = prepareAST(`
      for (;;) {
        const a: number = 2;
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualScope = actual.body.get("[[Scope2-15]]");
    const expectedScope = expect.objectContaining({
      type: "block",
      parent: actual
    });
    const expectedVariable = expect.objectContaining({
      type: new Type("number"),
      parent: actualScope
    });
    expect(actualScope).toEqual(expectedScope);
    expect(actualScope.body.get("a")).toEqual(expectedVariable);
  });
  test("Do operator scope", () => {
    const sourceAST = prepareAST(`
      do {
        const a: number = 2;
      } while(true)
    `);
    const actual = createTypeGraph(sourceAST);
    const actualScope = actual.body.get("[[Scope2-9]]");
    const expectedScope = expect.objectContaining({
      type: "block",
      parent: actual
    });
    const expectedVariable = expect.objectContaining({
      type: new Type("number"),
      parent: actualScope
    });
    expect(actualScope).toEqual(expectedScope);
    expect(actualScope.body.get("a")).toEqual(expectedVariable);
  });
});

describe("Function typings and declarations", () => {
  test("Create global function with Function Declaration", () => {
    const sourceAST = prepareAST(`
      function a()
      {

      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("a");
    const actualAScope = actual.body.get("[[Scope2-6]]");
    const expectedAFunction = expect.objectContaining({
      parent: actual
    });
    const expectedAScope = expect.objectContaining({
      parent: actual,
      type: "function",
      declaration: actualAFunction
    });
    expect(actualAFunction).toEqual(expectedAFunction);
    expect(actualAScope).toEqual(expectedAScope);
  });
  test("Create global function with Function Expression", () => {
    const sourceAST = prepareAST(`
      const a = function ()
      {

      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("a");
    const actualAScope = actual.body.get("[[Scope2-16]]");
    const expectedAFunction = expect.objectContaining({
      parent: actual
    });
    const expectedAScope = expect.objectContaining({
      parent: actual,
      type: "function",
      declaration: actualAFunction
    });
    expect(actualAFunction).toEqual(expectedAFunction);
    expect(actualAScope).toEqual(expectedAScope);
  });
  test("Create global function with Arrow Function Expression", () => {
    const sourceAST = prepareAST(`
      const a = () =>
      {

      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("a");
    const actualAScope = actual.body.get("[[Scope2-16]]");
    const expectedAFunction = expect.objectContaining({
      parent: actual
    });
    const expectedAScope = expect.objectContaining({
      parent: actual,
      type: "function",
      declaration: actualAFunction
    });
    expect(actualAFunction).toEqual(expectedAFunction);
    expect(actualAScope).toEqual(expectedAScope);
  });
});
describe("Simple objects with property typing", () => {
  test("Simple object with typed return inside method in module scope", () => {
    const sourceAST = prepareAST(`
      const obj = {
        a(): number {
          return 2;
        },
      };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualAScope = actual.body.get("[[Scope3-8]]");
    const actualObj = actual.body.get("obj");
    const actualKeySize = actualObj.type.properties.size;
    const actualA = actualObj.type.properties.get("a");
    const expectedAScope = expect.objectContaining({
      parent: actual,
      type: "function",
      declaration: actualA
    });
    const expectedAType = new FunctionType(
      "() => number",
      [],
      new Type("number"),
      false
    );
    const expectedObj = expect.objectContaining({
      parent: actual
    });
    expect(actualObj).toEqual(expectedObj);
    expect(actualKeySize).toEqual(1);
    expect(actualAScope).toEqual(expectedAScope);
    expect(actualA.type).toEqual(expectedAType);
  });
  test("Simple object with typed argument inside method in module scope", () => {
    const sourceAST = prepareAST(`
      const obj = {
        a(b: string) {
        },
      };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualAScope = actual.body.get("[[Scope3-8]]");
    const actualObj = actual.body.get("obj");
    const actualKeySize = actualObj.type.properties.size;
    const actualA = actualObj.type.properties.get("a");
    const expectedAScope = expect.objectContaining({
      parent: actual,
      type: "function",
      declaration: actualA
    });
    const expectedAType = new FunctionType(
      "(string) => ?",
      [new Type("string")],
      new Type("?"),
      false
    );
    const expectedObj = expect.objectContaining({
      parent: actual
    });
    expect(actualObj).toEqual(expectedObj);
    expect(actualKeySize).toEqual(1);
    expect(actualAScope).toEqual(expectedAScope);
    expect(actualA.type).toEqual(expectedAType);
  });
  test("Simple object with typed return arrow function property in module scope", () => {
    const sourceAST = prepareAST(`
      const obj = {
        a: (): number => 2
      };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualObj = actual.body.get("obj");
    const actualKeySize = actualObj.type.properties.size;
    const actualA = actualObj.type.properties.get("a");
    const expectedAType = new FunctionType(
      "() => number",
      [],
      new Type("number"),
      false
    );
    const expectedObj = expect.objectContaining({
      parent: actual
    });
    expect(actualObj).toEqual(expectedObj);
    expect(actualKeySize).toEqual(1);
    expect(actualA.type).toEqual(expectedAType);
  });
  test("Simple object with typed arguments inside arrow function property in module scope", () => {
    const sourceAST = prepareAST(`
      const obj = {
        a: (a: number, b: string) => 2
      };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualObj = actual.body.get("obj");
    const actualKeySize = actualObj.type.properties.size;
    const actualA = actualObj.type.properties.get("a");
    const expectedAType = new FunctionType(
      "(number, string) => ?",
      [new Type("number"), new Type("string")],
      new Type("?"),
      false
    );
    const expectedObj = expect.objectContaining({
      parent: actual
    });
    expect(actualObj).toEqual(expectedObj);
    expect(actualKeySize).toEqual(1);
    expect(actualA.type).toEqual(expectedAType);
  });
  test("Simple object with typed return function property in module scope", () => {
    const sourceAST = prepareAST(`
      const obj = {
        a: function(): number {
          return 2;
        }
      };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualObj = actual.body.get("obj");
    const actualKeySize = actualObj.type.properties.size;
    const actualA = actualObj.type.properties.get("a");
    const actualAScope = actual.body.get("[[Scope3-11]]");
    const expectedAType = new FunctionType(
      "() => number",
      [],
      new Type("number"),
      false
    );
    const expectedAScope = expect.objectContaining({
      parent: actual,
      type: "function",
      declaration: actualA
    });
    const expectedObj = expect.objectContaining({
      parent: actual
    });
    expect(actualObj).toEqual(expectedObj);
    expect(actualAScope).toEqual(expectedAScope);
    expect(actualKeySize).toEqual(1);
    expect(actualA.type).toEqual(expectedAType);
  });
  test("Simple object with typed arguments inside function property in module scope", () => {
    const sourceAST = prepareAST(`
      const obj = {
        a: function(a: number, b: string) {}
      };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualObj = actual.body.get("obj");
    const actualKeySize = actualObj.type.properties.size;
    const actualA = actualObj.type.properties.get("a");
    const actualAScope = actual.body.get("[[Scope3-11]]");
    const expectedAType = new FunctionType(
      "(number, string) => ?",
      [new Type("number"), new Type("string")],
      new Type("?"),
      false
    );
    const expectedAScope = expect.objectContaining({
      parent: actual,
      type: "function",
      declaration: actualA
    });
    const expectedObj = expect.objectContaining({
      parent: actual
    });
    expect(actualObj).toEqual(expectedObj);
    expect(actualAScope).toEqual(expectedAScope);
    expect(actualKeySize).toEqual(1);
    expect(actualA.type).toEqual(expectedAType);
  });
  test("Object expression inside object exprssion", () => {
    const sourceAST = prepareAST(`
      const obj = {
        a: {
          b(): number {

          }
        }
      };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualObj = actual.body.get("obj");
    const actualKeySize = actualObj.type.properties.size;
    const actualAKeySize = actualObj.type.properties.size;
    const actualA = actualObj.type.properties.get("a");
    const actualB = actualA.type.properties.get("b");
    const actualBScope = actual.body.get("[[Scope4-10]]");
    const expectedBType = new FunctionType(
      "() => number",
      [],
      new Type("number"),
      false
    );
    const expectedAScope = expect.objectContaining({
      parent: actual,
      type: "function",
      declaration: actualB
    });
    const expectedObj = expect.objectContaining({
      parent: actual
    });
    expect(actualObj).toEqual(expectedObj);
    expect(actualKeySize).toEqual(1);
    expect(actualAKeySize).toEqual(1);
    expect(actualB.type).toEqual(expectedBType);
    expect(actualBScope).toEqual(expectedAScope);
  });
});
describe("Unnamed object types", () => {
  test("Primitive number inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: number } = { n: 2 };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new Type(
        "{ n: number }",
        {
          isLiteral: true
        },
        [["n", new TypeInfo(new Type("number"), actual, actualA.meta)]]
      )
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Primitive string inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: string } = { n: '' };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new Type(
        "{ n: string }",
        {
          isLiteral: true
        },
        [["n", new TypeInfo(new Type("string"), actual, actualA.meta)]]
      )
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Primitive boolean inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: boolean } = { n: false };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new Type(
        "{ n: boolean }",
        {
          isLiteral: true
        },
        [["n", new TypeInfo(new Type("boolean"), actual, actualA.meta)]]
      )
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Primitive boolean inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: boolean } = { n: false };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new Type(
        "{ n: boolean }",
        {
          isLiteral: true
        },
        [["n", new TypeInfo(new Type("boolean"), actual, actualA.meta)]]
      )
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Primitive void inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: void } = { n: null };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new Type(
        "{ n: void }",
        {
          isLiteral: true
        },
        [["n", new TypeInfo(new Type("void"), actual, actualA.meta)]]
      )
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Primitive mixed inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: mixed } = { n: null };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new Type(
        "{ n: mixed }",
        {
          isLiteral: true
        },
        [["n", new TypeInfo(new Type("mixed"), undefined, actualA.meta)]]
      )
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Primitive any inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: any } = { n: null };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new Type(
        "{ n: any }",
        {
          isLiteral: true
        },
        [["n", new TypeInfo(new Type("any"), undefined, actualA.meta)]]
      )
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Literal number inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: 2 } = { n: 2 };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new Type(
        "{ n: 2 }",
        {
          isLiteral: true
        },
        [
          [
            "n",
            new TypeInfo(
              new Type(2, { isLiteral: true }),
              undefined,
              actualA.meta
            )
          ]
        ]
      )
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Literal string inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: '' } = { n: '' };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new Type(
        "{ n: '' }",
        {
          isLiteral: true
        },
        [
          [
            "n",
            new TypeInfo(
              new Type("", { isLiteral: true }),
              undefined,
              actualA.meta
            )
          ]
        ]
      )
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Literal boolean inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: true } = { n: true };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new Type(
        "{ n: true }",
        {
          isLiteral: true
        },
        [
          [
            "n",
            new TypeInfo(
              new Type(true, { isLiteral: true }),
              undefined,
              actualA.meta
            )
          ]
        ]
      )
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Literal null inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: null } = { n: null };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new Type("{ n: null }", { isLiteral: true }, [
        [
          "n",
          new TypeInfo(
            new Type(null, { isLiteral: true }),
            undefined,
            actualA.meta
          )
        ]
      ])
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Literal undefined inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: undefined } = { n: undefined };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const actualN = actualA.type.properties.get("n");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new Type("{ n: undefined }", { isLiteral: true }, [
        ["n", new TypeInfo(new Type("undefined"), undefined, actualN.meta)]
      ])
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Functional types inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { 
        f: (string, number) => number
      } = { f(a, b) { return b } };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const actualF = actualA.type.properties.get("f");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new Type("{ f: (string, number) => number }", { isLiteral: true }, [
        [
          "f",
          new TypeInfo(
            new FunctionType(
              "(string, number) => number",
              [new Type("string"), new Type("number")],
              new Type("number")
            ),
            undefined,
            actualF.meta
          )
        ]
      ])
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Object type inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: { c: number } } = { n: { c: 2 } };
    `);
    const actual = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new Type("{ n: { c: number } }", { isLiteral: true }, [
        [
          "n",
          new TypeInfo(
            new Type("{ c: number }", { isLiteral: true }, [
              ["c", new TypeInfo(new Type("number"), undefined, actualA.meta)]
            ]),
            undefined,
            actualA.meta
          )
        ]
      ])
    });
    expect(actualA).toEqual(expectedA);
  });
});
