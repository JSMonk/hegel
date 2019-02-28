const HegelError = require("../build/utils/errors").default;
const prepareAST = require("./preparation");
const createTypeGraph = require("../build/type-graph/type-graph").default;
const { Type } = require("../build/type-graph/types/type");
const { TypeVar } = require("../build/type-graph/types/type-var");
const { UnionType } = require("../build/type-graph/types/union-type");
const { ObjectType } = require("../build/type-graph/types/object-type");
const { GenericType } = require("../build/type-graph/types/generic-type");
const { FunctionType } = require("../build/type-graph/types/function-type");
const { VariableInfo } = require("../build/type-graph/variable-info");
const { UNDEFINED_TYPE, TYPE_SCOPE } = require("../build/type-graph/constants");

describe("Simple global variable nodes", () => {
  test("Creating global module variable with number type", () => {
    const sourceAST = prepareAST(`
      const a: number = 2;
    `);
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
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
    try {
      createTypeGraph(sourceAST);
    } catch (e) {
      expect(e.constructor).toEqual(HegelError);
      expect(e.message).toEqual('There is no "any" type in Hegel.');
      expect(e.loc).toEqual({
        start: { line: 2, column: 15 },
        end: { line: 2, column: 18 }
      });
    }
  });
  test("Creating global module variable with mixed type", () => {
    const sourceAST = prepareAST(`
      const a: mixed = 2;
    `);
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type(null, { isLiteralOf: new Type("void") }),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with literal number type", () => {
    const sourceAST = prepareAST(`
      const a: 2 = 2;
    `);
    const [actual] = createTypeGraph(sourceAST);
    const typeScope = actual.body.get(TYPE_SCOPE);
    const expected = expect.objectContaining({
      type: new Type(2, { isLiteralOf: typeScope.body.get("number").type }),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with literal string type", () => {
    const sourceAST = prepareAST(`
      const a: '2' = '2';
    `);
    const [actual] = createTypeGraph(sourceAST);
    const typeScope = actual.body.get(TYPE_SCOPE);
    const expected = expect.objectContaining({
      type: new Type("2", { isLiteralOf: typeScope.body.get("string").type }),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with literal boolean type", () => {
    const sourceAST = prepareAST(`
      const a: false = false;
    `);
    const [actual] = createTypeGraph(sourceAST);
    const typeScope = actual.body.get(TYPE_SCOPE);
    const expected = expect.objectContaining({
      type: new Type(false, {
        isLiteralOf: typeScope.body.get("boolean").type
      }),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with literal undefined type", () => {
    const sourceAST = prepareAST(`
      const a: undefined = undefined;
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("undefined", { isLiteralOf: new Type("void") }),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Create global module function declaration with return type", () => {
    const sourceAST = prepareAST(`
      function a(a, b): number {
        return 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("a");
    expect(actualAFunction.type.subordinateType.returnType).toEqual(
      new Type("number")
    );
  });
  test("Create global module function declaration with arguments types", () => {
    const sourceAST = prepareAST(`
      function a(a: number, b: string) {
        return 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("a");
    expect(actualAFunction.type.argumentsTypes).toEqual([
      new Type("number"),
      new Type("string")
    ]);
  });
  test("Create global module function declaration with arguments and return types", () => {
    const sourceAST = prepareAST(`
      function a(a: number, b: string): number {
        return 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("[[Anonymuos2-16]]");
    expect(actualAFunction.type.subordinateType.returnType).toEqual(
      new Type("number")
    );
  });
  test("Create global module function expression with arguments types", () => {
    const sourceAST = prepareAST(`
      const a = function(a: number, b: string) {
        return 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("[[Anonymuos2-16]]");
    expect(actualAFunction.type.argumentsTypes).toEqual([
      new Type("number"),
      new Type("string")
    ]);
  });
  test("Create global module function expression with arguments and return types", () => {
    const sourceAST = prepareAST(`
      const a = function(a: number, b: string): number {
        return 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("[[Anonymuos2-16]]");
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
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
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
  test("Create nested variable with 'var' kind", () => {
    const sourceAST = prepareAST(`
      {
        var b = 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("a");
    const actualAnonymousFunction = actual.body.get("[[Anonymuos2-16]]");
    const actualAScope = actual.body.get("[[Scope2-16]]");
    const expectedAFunction = expect.objectContaining({
      parent: actual
    });
    const expectedAScope = expect.objectContaining({
      parent: actual,
      type: "function",
      declaration: actualAnonymousFunction
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
    const [actual] = createTypeGraph(sourceAST);
    const actualAFunction = actual.body.get("a");
    const actualAnonymousFunction = actual.body.get("[[Anonymuos2-16]]");
    const actualAScope = actual.body.get("[[Scope2-16]]");
    const expectedAFunction = expect.objectContaining({
      parent: actual
    });
    const expectedAScope = expect.objectContaining({
      parent: actual,
      type: "function",
      declaration: actualAnonymousFunction
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
    const [actual] = createTypeGraph(sourceAST);
    const actualAScope = actual.body.get("[[Scope3-8]]");
    const expectedAScope = expect.objectContaining({
      parent: actual,
      type: "function"
    });
    const expectedAType = new FunctionType(
      "() => number",
      [],
      new Type("number"),
      false
    );
    expect(actualAScope).toEqual(expectedAScope);
    expect(actualAScope.declaration.type).toEqual(expectedAType);
  });
  test("Simple object with typed argument inside method in module scope", () => {
    const sourceAST = prepareAST(`
      const obj = {
        a(b: string) {},
      };
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAScope = actual.body.get("[[Scope3-8]]");
    const expectedAScope = expect.objectContaining({
      parent: actual,
      type: "function"
    });
    expect(actualAScope).toEqual(expectedAScope);
    expect(actualAScope.declaration.type.argumentsTypes).toEqual([
      new Type("string")
    ]);
  });
  test("Simple object with typed return arrow function property in module scope", () => {
    const sourceAST = prepareAST(`
      const obj = {
        a: (): number => 2
      };
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAScope = actual.body.get("[[Scope3-11]]");
    const expectedAType = new FunctionType(
      "() => number",
      [],
      new Type("number"),
      false
    );
    const expectedAScope = expect.objectContaining({
      parent: actual,
      type: "function"
    });
    expect(actualAScope).toEqual(expectedAScope);
    expect(actualAScope.declaration.type).toEqual(expectedAType);
  });
  test("Simple object with typed arguments inside arrow function property in module scope", () => {
    const sourceAST = prepareAST(`
      const obj = {
        a: (a: number, b: string) => 2
      };
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAScope = actual.body.get("[[Scope3-11]]");
    const expectedAScope = expect.objectContaining({
      parent: actual,
      type: "function"
    });
    expect(actualAScope).toEqual(expectedAScope);
    expect(actualAScope.declaration.type.argumentsTypes).toEqual([
      new Type("number"),
      new Type("string")
    ]);
  });
  test("Simple object with typed return function property in module scope", () => {
    const sourceAST = prepareAST(`
      const obj = {
        a: function(): number {
          return 2;
        }
      };
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAScope = actual.body.get("[[Scope3-11]]");
    const expectedAType = new FunctionType(
      "() => number",
      [],
      new Type("number"),
      false
    );
    const expectedAScope = expect.objectContaining({
      parent: actual,
      type: "function"
    });
    expect(actualAScope).toEqual(expectedAScope);
    expect(actualAScope.declaration.type).toEqual(expectedAType);
  });
  test("Simple object with typed arguments inside function property in module scope", () => {
    const sourceAST = prepareAST(`
      const obj = {
        a: function(a: number, b: string) {}
      };
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAScope = actual.body.get("[[Scope3-11]]");
    const expectedAScope = expect.objectContaining({
      parent: actual,
      type: "function"
    });
    expect(actualAScope).toEqual(expectedAScope);
    expect(actualAScope.declaration.type.argumentsTypes).toEqual([
      new Type("number"),
      new Type("string")
    ]);
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
    const [actual] = createTypeGraph(sourceAST);
    const actualBScope = actual.body.get("[[Scope4-10]]");
    const expectedBType = new FunctionType(
      "() => number",
      [],
      new Type("number"),
      false
    );
    const expectedAScope = expect.objectContaining({
      parent: actual,
      type: "function"
    });
    expect(actualBScope).toEqual(expectedAScope);
    expect(actualBScope.declaration.type).toEqual(expectedBType);
  });
});
describe("Unnamed object types", () => {
  test("Primitive number inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: number } = { n: 2 };
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new ObjectType("{ n: number }", [
        ["n", new VariableInfo(new Type("number"), actual, actualA.meta)]
      ])
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Primitive string inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: string } = { n: '' };
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new ObjectType("{ n: string }", [
        ["n", new VariableInfo(new Type("string"), actual, actualA.meta)]
      ])
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Primitive boolean inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: boolean } = { n: false };
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new ObjectType("{ n: boolean }", [
        ["n", new VariableInfo(new Type("boolean"), actual, actualA.meta)]
      ])
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Primitive void inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: void } = { n: null };
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new ObjectType("{ n: void }", [
        ["n", new VariableInfo(new Type("void"), actual, actualA.meta)]
      ])
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Primitive mixed inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: mixed } = { n: null };
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new ObjectType("{ n: mixed }", [
        ["n", new VariableInfo(new Type("mixed"), undefined, actualA.meta)]
      ])
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Literal number inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: 2 } = { n: 2 };
    `);
    const [actual] = createTypeGraph(sourceAST);
    const typeScope = actual.body.get(TYPE_SCOPE);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new ObjectType("{ n: 2 }", [
        [
          "n",
          new VariableInfo(
            new Type(2, { isLiteralOf: typeScope.body.get("number").type }),
            undefined,
            actualA.meta
          )
        ]
      ])
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Literal string inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: '' } = { n: '' };
    `);
    const [actual] = createTypeGraph(sourceAST);
    const typeScope = actual.body.get(TYPE_SCOPE);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new ObjectType("{ n: '' }", [
        [
          "n",
          new VariableInfo(
            new Type("", { isLiteralOf: typeScope.body.get("string").type }),
            undefined,
            actualA.meta
          )
        ]
      ])
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Literal boolean inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: true } = { n: true };
    `);
    const [actual] = createTypeGraph(sourceAST);
    const typeScope = actual.body.get(TYPE_SCOPE);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new ObjectType("{ n: true }", [
        [
          "n",
          new VariableInfo(
            new Type(true, { isLiteralOf: typeScope.body.get("boolean").type }),
            undefined,
            actualA.meta
          )
        ]
      ])
    });
    expect(actualA).toEqual(expectedA);
  });
  test("Literal null inside object type", () => {
    const sourceAST = prepareAST(`
      const a: { n: null } = { n: null };
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new ObjectType("{ n: null }", [
        [
          "n",
          new VariableInfo(
            new Type(null, { isLiteralOf: new Type("void") }),
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
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const actualN = actualA.type.properties.get("n");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new ObjectType("{ n: undefined }", [
        [
          "n",
          new VariableInfo(
            new Type("undefined", { isLiteralOf: new Type("void") }),
            undefined,
            actualN.meta
          )
        ]
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
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const actualF = actualA.type.properties.get("f");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new ObjectType("{ f: (string, number) => number }", [
        [
          "f",
          new VariableInfo(
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
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    const expectedA = expect.objectContaining({
      parent: actual,
      type: new ObjectType("{ n: { c: number } }", [
        [
          "n",
          new VariableInfo(
            new ObjectType("{ c: number }", [
              [
                "c",
                new VariableInfo(new Type("number"), undefined, actualA.meta)
              ]
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
describe("Type alias", () => {
  describe("Primitive type alias", () => {
    test("Number primitive type alias", () => {
      const sourceAST = prepareAST(`
        type NumberAlias = number;
      `);
      const [actual] = createTypeGraph(sourceAST);
      const typeAlias = actual.body.get(TYPE_SCOPE);
      const actualType = typeAlias.body.get("NumberAlias");
      const expectedType = expect.objectContaining({
        parent: typeAlias,
        type: new Type("number")
      });
      expect(actualType).toEqual(expectedType);
    });
    test("Boolean primitive type alias", () => {
      const sourceAST = prepareAST(`
        type BooleanAlias = boolean;
      `);
      const [actual] = createTypeGraph(sourceAST);
      const typeAlias = actual.body.get(TYPE_SCOPE);
      const actualType = typeAlias.body.get("BooleanAlias");
      const expectedType = expect.objectContaining({
        parent: typeAlias,
        type: new Type("boolean")
      });
      expect(actualType).toEqual(expectedType);
    });
    test("String primitive type alias", () => {
      const sourceAST = prepareAST(`
        type StringAlias = string;
      `);
      const [actual] = createTypeGraph(sourceAST);
      const typeAlias = actual.body.get(TYPE_SCOPE);
      const actualType = typeAlias.body.get("StringAlias");
      const expectedType = expect.objectContaining({
        parent: typeAlias,
        type: new Type("string")
      });
      expect(actualType).toEqual(expectedType);
    });
    test("Undefined primitive type alias", () => {
      const sourceAST = prepareAST(`
        type UndefinedAlias = undefined;
      `);
      const [actual] = createTypeGraph(sourceAST);
      const typeAlias = actual.body.get(TYPE_SCOPE);
      const actualType = typeAlias.body.get("UndefinedAlias");
      const expectedType = expect.objectContaining({
        parent: typeAlias,
        type: new Type("undefined", { isLiteralOf: new Type("void") })
      });
      expect(actualType).toEqual(expectedType);
    });
    test("Symbol primitive type alias", () => {
      const sourceAST = prepareAST(`
        type SymbolAlias = Symbol;
      `);
      const [actual] = createTypeGraph(sourceAST);
      const typeAlias = actual.body.get(TYPE_SCOPE);
      const actualType = typeAlias.body.get("SymbolAlias");
      const expectedType = expect.objectContaining({
        parent: typeAlias,
        type: new Type("Symbol")
      });
      expect(actualType).toEqual(expectedType);
    });
  });
  describe("Literal type alias", () => {
    test("Number literal type alias", () => {
      const sourceAST = prepareAST(`
        type NumberAlias = 2;
      `);
      const [actual] = createTypeGraph(sourceAST);
      const typeScope = actual.body.get(TYPE_SCOPE);
      const actualType = typeScope.body.get("NumberAlias");
      const expectedType = expect.objectContaining({
        parent: typeScope,
        type: new Type(2, { isLiteralOf: typeScope.body.get("number").type })
      });
      expect(actualType).toEqual(expectedType);
    });
    test("Boolean literal type alias", () => {
      const sourceAST = prepareAST(`
        type BooleanAlias = false;
      `);
      const [actual] = createTypeGraph(sourceAST);
      const typeScope = actual.body.get(TYPE_SCOPE);
      const actualType = typeScope.body.get("BooleanAlias");
      const expectedType = expect.objectContaining({
        parent: typeScope,
        type: new Type(false, {
          isLiteralOf: typeScope.body.get("boolean").type
        })
      });
      expect(actualType).toEqual(expectedType);
    });
    test("String literal type alias", () => {
      const sourceAST = prepareAST(`
        type StringAlias = "";
      `);
      const [actual] = createTypeGraph(sourceAST);
      const typeScope = actual.body.get(TYPE_SCOPE);
      const actualType = typeScope.body.get("StringAlias");
      const expectedType = expect.objectContaining({
        parent: typeScope,
        type: new Type("", { isLiteralOf: typeScope.body.get("string").type })
      });
      expect(actualType).toEqual(expectedType);
    });
    test("Null literal type alias", () => {
      const sourceAST = prepareAST(`
        type NullAlias = null;
      `);
      const [actual] = createTypeGraph(sourceAST);
      const typeAlias = actual.body.get(TYPE_SCOPE);
      const actualType = typeAlias.body.get("NullAlias");
      const expectedType = expect.objectContaining({
        parent: typeAlias,
        type: new Type(null, { isLiteralOf: new Type("void") })
      });
      expect(actualType).toEqual(expectedType);
    });
    test("Generic type alias", () => {
      const sourceAST = prepareAST(`
        type A<T> = T;
        type B = A<number>;
      `);
      const [actual] = createTypeGraph(sourceAST);
      const typeScope = actual.body.get(TYPE_SCOPE);
      const actualType = typeScope.body.get("B");
      const expectedType = expect.objectContaining({
        parent: typeScope,
        type: new Type("number")
      });
      expect(actualType).toEqual(expectedType);
      expect(typeScope.body.get("A<number>")).toEqual(expectedType);
    });
  });
  describe("Object type alias", () => {
    test("Object type alias", () => {
      const sourceAST = prepareAST(`
        type A = {
          a: number,
          b: () => number
        };
      `);
      const [actual] = createTypeGraph(sourceAST);
      const typeAlias = actual.body.get(TYPE_SCOPE);
      const actualType = typeAlias.body.get("A");
      const expectedType = expect.objectContaining({
        parent: typeAlias,
        type: new ObjectType("{ a: number, b: () => number }", [
          ["a", new Type("number")],
          ["b", new FunctionType("() => number", [], new Type("number"))]
        ])
      });
      expect(actualType).toEqual(expectedType);
    });
  });
  describe("Funciton type alias", () => {
    test("type alias for function", () => {
      const sourceAST = prepareAST(`
        type a = (number, number) => string
      `);
      const [actual] = createTypeGraph(sourceAST);
      const typeAlias = actual.body.get(TYPE_SCOPE);
      const actualType = typeAlias.body.get("a");
      const expectedType = expect.objectContaining({
        parent: typeAlias,
        type: new FunctionType(
          "(number, number) => string",
          [new Type("number"), new Type("number")],
          new Type("string")
        )
      });
      expect(actualType).toEqual(expectedType);
    });
  });
});
describe("Generic types", () => {
  describe("Type alias generic types", () => {
    test("Type alias with simple generic", () => {
      const sourceAST = prepareAST(`
        type A<T> = { a: T };
      `);
      const [actual] = createTypeGraph(sourceAST);
      const typeScope = actual.body.get(TYPE_SCOPE);
      const actualTypeAlias = typeScope.body.get("A");
      const actualGenericType = actualTypeAlias.type;
      expect(actualTypeAlias).not.toBe(undefined);
      expect(actualGenericType.localTypeScope.body.get("T")).not.toBe(
        undefined
      );
    });
    test("Type alias with multiple generic arguments", () => {
      const sourceAST = prepareAST(`
        type A<T, U> = { a: T, b: U };
      `);
      const [actual] = createTypeGraph(sourceAST);
      const typeScope = actual.body.get(TYPE_SCOPE);
      const actualTypeAlias = typeScope.body.get("A");
      const actualGenericType = actualTypeAlias.type;
      expect(actualTypeAlias).not.toBe(undefined);
      expect(actualGenericType.localTypeScope.body.get("T")).not.toBe(
        undefined
      );
      expect(actualGenericType.localTypeScope.body.get("U")).not.toBe(
        undefined
      );
    });
    test("Type alias with generic restriction", () => {
      const sourceAST = prepareAST(`
        type A<T: number> = { a: T };
      `);
      const [actual] = createTypeGraph(sourceAST);
      const typeScope = actual.body.get(TYPE_SCOPE);
      const actualTypeAlias = typeScope.body.get("A");
      const actualAliasType = actualTypeAlias.type;
      expect(actualTypeAlias).not.toBe(undefined);
      expect(actualAliasType.constructor).toBe(GenericType);
      expect(actualAliasType.subordinateType.properties.get("a").type).toEqual(
        new TypeVar("T", new Type("number"), true)
      );
    });
  });
  describe("Function generic types", () => {
    test("Function declaration with simple generic", () => {
      const sourceAST = prepareAST(`
          function a<T>(b: T): T { return b; }
        `);
      const [actual] = createTypeGraph(sourceAST);
      const actualFunctionType = actual.body.get("a");
      const actualGenericType = actualFunctionType.type;
      expect(actualFunctionType).not.toBe(undefined);
      expect(actualGenericType.localTypeScope.body.get("T")).not.toBe(
        undefined
      );
    });
    test("Function declaration multiple generic arguments", () => {
      const sourceAST = prepareAST(`
          function a<T, U>(b: T, c: U): U { return c; }
        `);
      const [actual] = createTypeGraph(sourceAST);
      const actualFunctionType = actual.body.get("a");
      const actualGenericType = actualFunctionType.type;
      expect(actualFunctionType).not.toBe(undefined);
      expect(actualGenericType.localTypeScope.body.get("T")).not.toBe(
        undefined
      );
      expect(actualGenericType.localTypeScope.body.get("U")).not.toBe(
        undefined
      );
    });
    test("Function declaration with generic restriction", () => {
      const sourceAST = prepareAST(`
          function a<T: string>(b: T): T { return b; }
        `);
      const [actual] = createTypeGraph(sourceAST);
      const actualFunction = actual.body.get("a");
      const expectedFunction = new FunctionType(
        "<T: string>(T) => T",
        [new TypeVar("T", new Type("string"), true)],
        new TypeVar("T", new Type("string"), true)
      );
      expect(actualFunction).not.toBe(undefined);
      expect(actualFunction.type.constructor).toBe(GenericType);
      expect(actualFunction.type.subordinateType).toEqual(expectedFunction);
    });
    test("Function type alias with generic", () => {
      const sourceAST = prepareAST(`
          type A = <T>(T) => T;
        `);
      const [actual] = createTypeGraph(sourceAST);
      const typeScope = actual.body.get(TYPE_SCOPE);
      const actualFunctionType = typeScope.body.get("A");
      const actualGenericType = actualFunctionType.type;
      const actualTypeT = actualGenericType.localTypeScope.body.get("T");
      expect(actualFunctionType).not.toBe(undefined);
      expect(actualTypeT).not.toBe(undefined);
    });
  });
  describe("Union types", () => {
    test("Union type for variable", () => {
      const sourceAST = prepareAST(`
          const a: number | string = 2;
        `);
      const [actual] = createTypeGraph(sourceAST);
      const actualVariableInfo = actual.body.get("a");
      const expectVariableInfo = expect.objectContaining({
        parent: actual,
        type: new UnionType("number | string", [
          new Type("number"),
          new Type("string")
        ])
      });
      expect(actualVariableInfo).toEqual(expectVariableInfo);
    });
    test("Union type in type alias", () => {
      const sourceAST = prepareAST(`
          type A = string | number;
        `);
      const [actual] = createTypeGraph(sourceAST);
      const actualTypeScope = actual.body.get(TYPE_SCOPE);
      const actualAType = actualTypeScope.body.get("A");
      const expectAType = expect.objectContaining({
        parent: actualTypeScope,
        type: new UnionType("number | string", [
          new Type("number"),
          new Type("string")
        ])
      });
      expect(actualAType).toEqual(expectAType);
    });
    test("Union type as argument type", () => {
      const sourceAST = prepareAST(`
          function a(b: string | number): void {}
        `);
      const [actual] = createTypeGraph(sourceAST);
      const actualAFunctionScope = actual.body.get("[[Scope2-10]]");
      const actualADeclarationInfo = actual.body.get("a");
      const actualBArgumentInfo = actualAFunctionScope.body.get("b");
      const actualArgumentDeclarationInfo =
        actualADeclarationInfo.type.argumentsTypes[0];
      const expectBArgumentType = new UnionType("number | string", [
        new Type("number"),
        new Type("string")
      ]);
      expect(actualBArgumentInfo.type).toEqual(expectBArgumentType);
      expect(actualArgumentDeclarationInfo).toEqual(expectBArgumentType);
    });
    test("Union type as return type", () => {
      const sourceAST = prepareAST(`
          function a(): string | number {}
        `);
      const [actual] = createTypeGraph(sourceAST);
      const actualADeclarationInfo = actual.body.get("a");
      const actualReturnInfo = actualADeclarationInfo.type.returnType;
      const expectReturnInfo = new UnionType("number | string", [
        new Type("number"),
        new Type("string")
      ]);
      expect(actualReturnInfo).toEqual(expectReturnInfo);
    });
  });
});
