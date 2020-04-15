const HegelError = require("../build/utils/errors").default;
const createTypeGraph = require("../build/type-graph/type-graph").default;
const { Type } = require("../build/type-graph/types/type");
const { UnionType } = require("../build/type-graph/types/union-type");
const { ObjectType } = require("../build/type-graph/types/object-type");
const { GenericType } = require("../build/type-graph/types/generic-type");
const { VariableInfo } = require("../build/type-graph/variable-info");
const { FunctionType } = require("../build/type-graph/types/function-type");
const { CollectionType } = require("../build/type-graph/types/collection-type");
const { CONSTRUCTABLE } = require("../build/type-graph/constants");
const {
  prepareAST,
  getModuleAST,
  mixTypeDefinitions
} = require("./preparation");

describe("Simple global variable nodes", () => {
  test("Creating global module variable with number type", async () => {
    const sourceAST = prepareAST(`
      const a: number = 2;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type === Type.Number).toBe(true);
    expect(a.parent).toBe(actual);
  });
  test("Creating global module variable with string type", async () => {
    const sourceAST = prepareAST(`
      const a: string = '2';
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type === Type.String).toBe(true);
    expect(a.parent).toBe(actual);
  });
  test("Creating global module variable with boolean type", async () => {
    const sourceAST = prepareAST(`
      const a: boolean = false;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type === Type.Boolean).toBe(true);
    expect(a.parent).toBe(actual);
  });
  test("Creating global module variable with undefined type", async () => {
    const sourceAST = prepareAST(`
      const a: undefined = undefined;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type === Type.Undefined).toBe(true);
    expect(a.parent).toBe(actual);
  });
  test("Creating global module variable with any type", async () => {
    const sourceAST = prepareAST(`
      const a: any = 2;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(1);
    const [error] = errors;
    expect(error).toBeInstanceOf(HegelError);
    expect(error.message).toEqual(
      'There is no "any" type in Hegel. Use "unknown" instead.'
    );
    expect(error.loc).toEqual({
      start: { line: 2, column: 15 },
      end: { line: 2, column: 18 }
    });
  });
  test("Creating global module variable with unknown type", async () => {
    const sourceAST = prepareAST(`
      const a: unknown = 2;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type === Type.Unknown).toBe(true);
    expect(a.parent).toBe(actual);
  });
  test("Creating global module variable with literal null type", async () => {
    const sourceAST = prepareAST(`
      const a: null = null;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type === Type.Null).toBe(true);
    expect(a.parent).toBe(actual);
  });
  test("Creating global module variable with literal number type", async () => {
    const sourceAST = prepareAST(`
      const a: 2 = 2;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type === Type.find(2)).toBe(true);
    expect(a.parent).toBe(actual);
  });
  test("Creating global module variable with literal string type", async () => {
    const sourceAST = prepareAST(`
      const a: '2' = '2';
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type === Type.find("'2'")).toBe(true);
    expect(a.parent).toBe(actual);
  });
  test("Creating global module variable with literal boolean type", async () => {
    const sourceAST = prepareAST(`
      const a: false = false;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type === Type.find(false)).toBe(true);
    expect(a.parent).toBe(actual);
  });
  test("Create global module function declaration with return type", async () => {
    const sourceAST = prepareAST(`
      function a(a, b): number {
        return 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(GenericType);
    expect(a.type.subordinateType.argumentsTypes.length).toBe(2);
    expect(a.type.subordinateType.returnType === Type.Number).toBe(true);
    expect(a.parent).toBe(actual);
  });
  test("Create global module function declaration with arguments types", async () => {
    const sourceAST = prepareAST(`
      function a(a: number, b: string) {
        return 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type.argumentsTypes.length).toBe(2);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.argumentsTypes[1] === Type.String).toBe(true);
    expect(a.parent).toBe(actual);
  });
  test("Create global module function declaration with arguments and return types", async () => {
    const sourceAST = prepareAST(`
      function a(a: number, b: string): number {
        return 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type.argumentsTypes.length).toBe(2);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.argumentsTypes[1] === Type.String).toBe(true);
    expect(a.type.returnType === Type.Number).toBe(true);
    expect(a.parent).toBe(actual);
  });
  test("Create global module function expression with return type", async () => {
    const sourceAST = prepareAST(`
      const a = function(a, b): number {
        return 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(GenericType);
    expect(a.type.subordinateType.argumentsTypes.length).toBe(2);
    expect(a.type.subordinateType.returnType === Type.Number).toBe(true);
    expect(a.parent).toBe(actual);
  });
  test("Create global module function expression with arguments types", async () => {
    const sourceAST = prepareAST(`
      const a = function(a: number, b: string) {
        return 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type.argumentsTypes.length).toBe(2);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.argumentsTypes[1] === Type.String).toBe(true);
    expect(a.parent).toBe(actual);
  });
  test("Create global module function expression with arguments and return types", async () => {
    const sourceAST = prepareAST(`
      const a = function(a: number, b: string): number {
        return 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type.argumentsTypes.length).toBe(2);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.argumentsTypes[1] === Type.String).toBe(true);
    expect(a.type.returnType === Type.Number).toBe(true);
    expect(a.parent).toBe(actual);
  });
  test("Create global module function expression with return type near init", async () => {
    const sourceAST = prepareAST(`
      const a: (number, number) => number = function(a, b) {
        return 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type.argumentsTypes.length).toBe(2);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.argumentsTypes[1] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.Number).toBe(true);
    expect(a.parent).toBe(actual);
  });
  test("Create global module arrow function expression with return type near init", async () => {
    const sourceAST = prepareAST(`
      const a: (number, number) => number = (a, b) => 2;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type.argumentsTypes.length).toBe(2);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.argumentsTypes[1] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.Number).toBe(true);
    expect(a.parent).toBe(actual);
  });
});

describe("Block scoped variables", () => {
  test("Global and block scopes", async () => {
    const sourceAST = prepareAST(`
      const a: number = 1;
      {
        const a: string = '2';
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const innerScope = actual.scopes.get("[[Scope3-6]]");
    const outerA = actual.body.get("a");
    const innerA = innerScope.body.get("a");
    expect(errors.length).toBe(0);
    expect(outerA.type === Type.Number).toBe(true);
    expect(outerA.parent).toBe(actual);
    expect(innerScope.parent).toBe(actual);
    expect(innerScope.type).toBe("block");
    expect(innerA.type === Type.String).toBe(true);
    expect(innerA.parent).toBe(innerScope);
  });
  test("Nested not global block scopes", async () => {
    const sourceAST = prepareAST(`
      {
        const a: number = 1;
        {
          const a: string = '2';
        }
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const firstLevelScope = actual.scopes.get("[[Scope2-6]]");
    const secondLevelScope = actual.scopes.get("[[Scope4-8]]");
    const firstLevelA = firstLevelScope.body.get("a");
    const secondLevelA = secondLevelScope.body.get("a");
    expect(errors.length).toBe(0);
    expect(firstLevelScope.parent).toBe(actual);
    expect(firstLevelScope.type).toBe("block");
    expect(secondLevelScope.parent).toBe(firstLevelScope);
    expect(secondLevelScope.type).toBe("block");
    expect(firstLevelA.type === Type.Number).toBe(true);
    expect(firstLevelA.parent).toBe(firstLevelScope);
    expect(secondLevelA.type === Type.String).toBe(true);
    expect(secondLevelA.parent).toBe(secondLevelScope);
  });
  test("Sibling scopes", async () => {
    const sourceAST = prepareAST(`
      {
        const a: number = 1;
      }
      {
        const a: string = '2';
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const firstScope = actual.scopes.get("[[Scope2-6]]");
    const secondScope = actual.scopes.get("[[Scope5-6]]");
    const firstA = firstScope.body.get("a");
    const secondA = secondScope.body.get("a");
    expect(errors.length).toBe(0);
    expect(firstScope.parent).toBe(actual);
    expect(firstScope.type).toBe("block");
    expect(secondScope.parent).toBe(actual);
    expect(secondScope.type).toBe("block");
    expect(firstA.type === Type.Number).toBe(true);
    expect(firstA.parent).toBe(firstScope);
    expect(secondA.type === Type.String).toBe(true);
    expect(secondA.parent).toBe(secondScope);
  });
  test("Create nested variable with 'var' kind", async () => {
    const sourceAST = prepareAST(`
      {
        var b: number = 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const innerScope = actual.scopes.get("[[Scope2-6]]");
    const innerB = innerScope.body.get("b");
    const outerB = actual.body.get("b");
    expect(errors.length).toBe(0);
    expect(innerScope.type).toBe("block");
    expect(innerScope.parent).toBe(actual);
    expect(innerB).toBe(undefined);
    expect(outerB.type === Type.Number).toBe(true);
    expect(outerB.parent).toBe(actual);
  });
  test("Create nested variable with 'var' kind inside function", async () => {
    const sourceAST = prepareAST(`
      function a() {
        {
          var b: number = 2;
        }
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const innerScope = actual.scopes.get("[[Scope3-8]]");
    const functionScope = actual.scopes.get("[[Scope2-6]]");
    const innerB = innerScope.body.get("b");
    const outerB = functionScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(innerScope.type).toBe("block");
    expect(innerScope.parent).toBe(functionScope);
    expect(functionScope.type).toBe("function");
    expect(functionScope.parent).toBe(actual);
    expect(innerB).toBe(undefined);
    expect(outerB.type === Type.Number).toBe(true);
    expect(outerB.parent).toBe(functionScope);
  });
});

describe("Operators scopes", () => {
  test("If operator scope", async () => {
    const sourceAST = prepareAST(`
      if (true) {
        const a: number = 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const innerScope = actual.scopes.get("[[Scope2-16]]");
    const innerA = innerScope.body.get("a");
    expect(errors.length).toBe(0);
    expect(innerA.type === Type.Number).toBe(true);
    expect(innerA.parent).toBe(innerScope);
  });
  test("While operator scope", async () => {
    const sourceAST = prepareAST(`
      while (true) {
        const a: number = 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const innerScope = actual.scopes.get("[[Scope2-19]]");
    const innerA = innerScope.body.get("a");
    expect(errors.length).toBe(0);
    expect(innerA.type === Type.Number).toBe(true);
    expect(innerA.parent).toBe(innerScope);
  });
  test("For operator scope", async () => {
    const sourceAST = prepareAST(`
      for (;;) {
        const a: number = 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const innerScope = actual.scopes.get("[[Scope2-15]]");
    const innerA = innerScope.body.get("a");
    expect(errors.length).toBe(0);
    expect(innerA.type === Type.Number).toBe(true);
    expect(innerA.parent).toBe(innerScope);
  });
  test("Do operator scope", async () => {
    const sourceAST = prepareAST(`
      do {
        const a: number = 2;
      } while(true)
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const innerScope = actual.scopes.get("[[Scope2-9]]");
    const innerA = innerScope.body.get("a");
    expect(errors.length).toBe(0);
    expect(innerA.type === Type.Number).toBe(true);
    expect(innerA.parent).toBe(innerScope);
  });
});

describe("Function typings and declarations", () => {
  test("Create global function with Function Declaration", async () => {
    const sourceAST = prepareAST(`
      function a()
      {

      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualAFunction = actual.body.get("a");
    const actualAScope = actual.scopes.get("[[Scope2-6]]");
    expect(errors.length).toBe(0);
    expect(actualAScope.type).toBe("function");
    expect(actualAScope.parent).toBe(actual);
    expect(actualAScope.declaration).toBe(actualAFunction);
    expect(actualAFunction.type).toBeInstanceOf(FunctionType);
    expect(actualAFunction.type.argumentsTypes.length).toBe(0);
    expect(actualAFunction.type.returnType === Type.Undefined).toBe(true);
  });
  test("Create global function with Function Expression", async () => {
    const sourceAST = prepareAST(`
      const a = function ()
      {

      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const actualAFunction = actual.body.get("[[Anonymuos2-16]]");
    const actualAScope = actual.scopes.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
    expect(actualAScope.type).toBe("function");
    expect(actualAScope.parent).toBe(actual);
    expect(actualAScope.declaration).toBe(actualAFunction);
    expect(a.type).toBe(actualAFunction.type);
    expect(actualAFunction.type).toBeInstanceOf(FunctionType);
    expect(actualAFunction.type.argumentsTypes.length).toBe(0);
    expect(actualAFunction.type.returnType === Type.Undefined).toBe(true);
  });
  test("Create global function with Arrow Function Expression", async () => {
    const sourceAST = prepareAST(`
      const a = () =>
      {

      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const actualAFunction = actual.body.get("[[Anonymuos2-16]]");
    const actualAScope = actual.scopes.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
    expect(actualAScope.type).toBe("function");
    expect(actualAScope.parent).toBe(actual);
    expect(actualAScope.declaration).toBe(actualAFunction);
    expect(a.type).toBe(actualAFunction.type);
    expect(actualAFunction.type).toBeInstanceOf(FunctionType);
    expect(actualAFunction.type.argumentsTypes.length).toBe(0);
    expect(actualAFunction.type.returnType === Type.Undefined).toBe(true);
  });
});
describe("Simple objects with property typing", () => {
  test("Simple object with typed return inside method in module scope", async () => {
    const sourceAST = prepareAST(`
      const obj = {
        a(): number {
          return 2;
        },
      };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const obj = actual.body.get("obj");
    const actualAScope = actual.scopes.get("[[Scope3-8]]");
    expect(errors.length).toBe(0);
    expect(actualAScope.declaration.type).toBeInstanceOf(FunctionType);
    expect(actualAScope.declaration.type === Type.find("() => number")).toBe(
      true
    );
    expect(actualAScope.declaration.type.argumentsTypes.length).toBe(0);
    expect(actualAScope.declaration.type.returnType === Type.Number).toBe(true);
    expect(obj.type).toBeInstanceOf(ObjectType);
    expect(obj.type === Type.find("{ a: () => number }")).toBe(true);
    expect(obj.type.properties.get("a").type).toBe(
      actualAScope.declaration.type
    );
  });
  test("Simple object with typed argument inside method in module scope", async () => {
    const sourceAST = prepareAST(`
      const obj = {
        a(b: string) {},
      };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const obj = actual.body.get("obj");
    const actualAScope = actual.scopes.get("[[Scope3-8]]");
    expect(errors.length).toBe(0);
    expect(actualAScope.declaration.type).toBeInstanceOf(FunctionType);
    expect(actualAScope.declaration.type).toBe(
      Type.find("(string) => undefined")
    );
    expect(actualAScope.declaration.type.argumentsTypes.length).toBe(1);
    expect(
      actualAScope.declaration.type.argumentsTypes[0] === Type.String
    ).toBe(true);
    expect(actualAScope.declaration.type.returnType === Type.Undefined).toBe(
      true
    );
    expect(obj.type).toBeInstanceOf(ObjectType);
    expect(obj.type === Type.find("{ a: (string) => undefined }")).toBe(true);
    expect(obj.type.properties.get("a").type).toBe(
      actualAScope.declaration.type
    );
  });
  test("Simple object with typed return arrow function property in module scope", async () => {
    const sourceAST = prepareAST(`
      const obj = {
        a: (): number => 2
      };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const obj = actual.body.get("obj");
    const actualAScope = actual.scopes.get("[[Scope3-11]]");
    expect(errors.length).toBe(0);
    expect(actualAScope.declaration.type).toBeInstanceOf(FunctionType);
    expect(actualAScope.declaration.type === Type.find("() => number")).toBe(
      true
    );
    expect(actualAScope.declaration.type.argumentsTypes.length).toBe(0);
    expect(actualAScope.declaration.type.returnType === Type.Number).toBe(true);
    expect(obj.type).toBeInstanceOf(ObjectType);
    expect(obj.type === Type.find("{ a: () => number }")).toBe(true);
    expect(obj.type.properties.get("a").type).toBe(
      actualAScope.declaration.type
    );
  });
  test("Simple object with typed arguments inside arrow function property in module scope", async () => {
    const sourceAST = prepareAST(`
      const obj = {
        a: (a: number, b: string) => 2
      };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const obj = actual.body.get("obj");
    const actualAScope = actual.scopes.get("[[Scope3-11]]");
    expect(errors.length).toBe(0);
    expect(actualAScope.declaration.type).toBeInstanceOf(FunctionType);
    expect(actualAScope.declaration.type).toBe(
      Type.find("(number, string) => number")
    );
    expect(actualAScope.declaration.type.argumentsTypes.length).toBe(2);
    expect(
      actualAScope.declaration.type.argumentsTypes[0] === Type.Number
    ).toBe(true);
    expect(
      actualAScope.declaration.type.argumentsTypes[1] === Type.String
    ).toBe(true);
    expect(actualAScope.declaration.type.returnType === Type.Number).toBe(true);
    expect(obj.type).toBeInstanceOf(ObjectType);
    expect(obj.type === Type.find("{ a: (number, string) => number }")).toBe(
      true
    );
    expect(obj.type.properties.get("a").type).toBe(
      actualAScope.declaration.type
    );
  });
  test("Simple object with typed return function property in module scope", async () => {
    const sourceAST = prepareAST(`
      const obj = {
        a: function(): number {
          return 2;
        }
      };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const obj = actual.body.get("obj");
    const actualAScope = actual.scopes.get("[[Scope3-11]]");
    expect(errors.length).toBe(0);
    expect(actualAScope.declaration.type).toBeInstanceOf(FunctionType);
    expect(actualAScope.declaration.type === Type.find("() => number")).toBe(
      true
    );
    expect(actualAScope.declaration.type.argumentsTypes.length).toBe(0);
    expect(actualAScope.declaration.type.returnType === Type.Number).toBe(true);
    expect(obj.type).toBeInstanceOf(ObjectType);
    expect(obj.type === Type.find("{ a: () => number }")).toBe(true);
    expect(obj.type.properties.get("a").type).toBe(
      actualAScope.declaration.type
    );
  });
  test("Simple object with typed arguments inside function property in module scope", async () => {
    const sourceAST = prepareAST(`
      const obj = {
        a: function(a: number, b: string) {}
      };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const obj = actual.body.get("obj");
    const actualAScope = actual.scopes.get("[[Scope3-11]]");
    expect(errors.length).toBe(0);
    expect(actualAScope.declaration.type).toBeInstanceOf(FunctionType);
    expect(actualAScope.declaration.type).toBe(
      Type.find("(number, string) => undefined")
    );
    expect(actualAScope.declaration.type.argumentsTypes.length).toBe(2);
    expect(
      actualAScope.declaration.type.argumentsTypes[0] === Type.Number
    ).toBe(true);
    expect(
      actualAScope.declaration.type.argumentsTypes[1] === Type.String
    ).toBe(true);
    expect(actualAScope.declaration.type.returnType === Type.Undefined).toBe(
      true
    );
    expect(obj.type).toBeInstanceOf(ObjectType);
    expect(obj.type === Type.find("{ a: (number, string) => undefined }")).toBe(
      true
    );
    expect(obj.type.properties.get("a").type).toBe(
      actualAScope.declaration.type
    );
  });
  test("Object expression inside object exprssion", async () => {
    const sourceAST = prepareAST(`
      const obj = {
        a: {
          b(): number {
            return 2;
          }
        }
      };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const obj = actual.body.get("obj");
    const actualAScope = actual.scopes.get("[[Scope4-10]]");
    expect(errors.length).toBe(0);
    expect(actualAScope.declaration.type).toBeInstanceOf(FunctionType);
    expect(actualAScope.declaration.type === Type.find("() => number")).toBe(
      true
    );
    expect(actualAScope.declaration.type.argumentsTypes.length).toBe(0);
    expect(actualAScope.declaration.type.returnType === Type.Number).toBe(true);
    expect(obj.type).toBeInstanceOf(ObjectType);
    expect(obj.type === Type.find("{ a: { b: () => number } }")).toBe(true);
    expect(obj.type.properties.get("a").type.properties.get("b").type).toBe(
      actualAScope.declaration.type
    );
  });
});
describe("Unnamed object types", () => {
  test("Primitive number inside object type", async () => {
    const sourceAST = prepareAST(`
      const a: { n: number } = { n: 2 };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type === Type.find("{ n: number }")).toBe(true);
    expect(a.type.properties.get("n").type === Type.Number).toBe(true);
  });
  test("Primitive string inside object type", async () => {
    const sourceAST = prepareAST(`
      const a: { n: string } = { n: '' };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type === Type.find("{ n: string }")).toBe(true);
    expect(a.type.properties.get("n").type === Type.String).toBe(true);
  });
  test("Primitive boolean inside object type", async () => {
    const sourceAST = prepareAST(`
      const a: { n: boolean } = { n: false };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type === Type.find("{ n: boolean }")).toBe(true);
    expect(a.type.properties.get("n").type === Type.Boolean).toBe(true);
  });
  test("Primitive undefined inside object type", async () => {
    const sourceAST = prepareAST(`
      const a: { n: undefined } = { n: undefined };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type === Type.find("{ n: undefined }")).toBe(true);
    expect(a.type.properties.get("n").type === Type.Undefined).toBe(true);
  });
  test("Primitive unknown inside object type", async () => {
    const sourceAST = prepareAST(`
      const a: { n: unknown } = { n: null };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type === Type.find("{ n: unknown }")).toBe(true);
    expect(a.type.properties.get("n").type === Type.Unknown).toBe(true);
  });
  test("Literal number inside object type", async () => {
    const sourceAST = prepareAST(`
      const a: { n: 2 } = { n: 2 };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type === Type.find("{ n: 2 }")).toBe(true);
    expect(a.type.properties.get("n").type === Type.find(2)).toBe(true);
  });
  test("Literal string inside object type", async () => {
    const sourceAST = prepareAST(`
      const a: { n: '' } = { n: '' };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type === Type.find("{ n: '' }")).toBe(true);
    expect(a.type.properties.get("n").type === Type.find("''")).toBe(true);
  });
  test("Literal boolean inside object type", async () => {
    const sourceAST = prepareAST(`
      const a: { n: true } = { n: true };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type === Type.find("{ n: true }")).toBe(true);
    expect(a.type.properties.get("n").type === Type.find(true)).toBe(true);
  });
  test("Literal null inside object type", async () => {
    const sourceAST = prepareAST(`
      const a: { n: null } = { n: null };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type === Type.find("{ n: null }")).toBe(true);
    expect(a.type.properties.get("n").type === Type.Null).toBe(true);
  });
  test("Functional types inside object type", async () => {
    const sourceAST = prepareAST(`
      const a: {
        f: (string, number) => number
      } = { f(a, b) { return b } };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type === Type.find("{ f: (string, number) => number }")).toBe(
      true
    );
    const f = a.type.properties.get("f").type;
    expect(f).toBeInstanceOf(FunctionType);
    expect(f.argumentsTypes.length).toBe(2);
    expect(f.argumentsTypes[0] === Type.String).toBe(true);
    expect(f.argumentsTypes[1] === Type.Number).toBe(true);
    expect(f.returnType === Type.Number).toBe(true);
  });
  test("Object type inside object type", async () => {
    const sourceAST = prepareAST(`
      const a: { n: { c: number } } = { n: { c: 2 } };
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type === Type.find("{ n: { c: number } }")).toBe(true);
    const n = a.type.properties.get("n");
    expect(n.type).toBeInstanceOf(ObjectType);
    expect(n.type === Type.find("{ c: number }")).toBe(true);
    expect(n.type.properties.get("c").type === Type.Number).toBe(true);
  });
});
describe("Type alias", () => {
  describe("Primitive type alias", () => {
    test("Number primitive type alias", async () => {
      const sourceAST = prepareAST(`
        type NumberAlias = number;
      `);
      const [[actual], errors] = await createTypeGraph([sourceAST]);
      const typeAlias = actual.typeScope;
      const NumberAlias = typeAlias.body.get("NumberAlias");
      expect(errors.length).toBe(0);
      expect(NumberAlias === Type.Number).toBe(true);
    });
    test("Boolean primitive type alias", async () => {
      const sourceAST = prepareAST(`
        type BooleanAlias = boolean;
      `);
      const [[actual], errors] = await createTypeGraph([sourceAST]);
      const typeAlias = actual.typeScope;
      const BooleanAlias = typeAlias.body.get("BooleanAlias");
      expect(errors.length).toBe(0);
      expect(BooleanAlias === Type.Boolean).toBe(true);
    });
    test("String primitive type alias", async () => {
      const sourceAST = prepareAST(`
        type StringAlias = string;
      `);
      const [[actual], errors] = await createTypeGraph([sourceAST]);
      const typeAlias = actual.typeScope;
      const StringAlias = typeAlias.body.get("StringAlias");
      expect(errors.length).toBe(0);
      expect(StringAlias === Type.String).toBe(true);
    });
    test("Undefined primitive type alias", async () => {
      const sourceAST = prepareAST(`
        type UndefinedAlias = undefined;
      `);
      const [[actual], errors] = await createTypeGraph([sourceAST]);
      const typeAlias = actual.typeScope;
      const UndefinedAlias = typeAlias.body.get("UndefinedAlias");
      expect(errors.length).toBe(0);
      expect(UndefinedAlias === Type.Undefined).toBe(true);
    });
    test("Symbol primitive type alias", async () => {
      const sourceAST = prepareAST(`
        type SymbolAlias = symbol;
      `);
      const [[actual], errors] = await createTypeGraph([sourceAST]);
      const typeAlias = actual.typeScope;
      const SymbolAlias = typeAlias.body.get("SymbolAlias");
      expect(SymbolAlias === Type.Symbol).toBe(true);
    });
  });
  describe("Literal type alias", () => {
    test("Number literal type alias", async () => {
      const sourceAST = prepareAST(`
        type NumberAlias = 2;
      `);
      const [[actual], errors] = await createTypeGraph([sourceAST]);
      const typeScope = actual.typeScope;
      const NumberAlias = typeScope.body.get("NumberAlias");
      expect(errors.length).toBe(0);
      expect(NumberAlias === Type.find(2)).toBe(true);
    });
    test("Boolean literal type alias", async () => {
      const sourceAST = prepareAST(`
        type BooleanAlias = false;
      `);
      const [[actual], errors] = await createTypeGraph([sourceAST]);
      const typeAlias = actual.typeScope;
      const BooleanAlias = typeAlias.body.get("BooleanAlias");
      expect(errors.length).toBe(0);
      expect(BooleanAlias === Type.find(false)).toBe(true);
    });
    test("String literal type alias", async () => {
      const sourceAST = prepareAST(`
        type StringAlias = "";
      `);
      const [[actual], errors] = await createTypeGraph([sourceAST]);
      const typeAlias = actual.typeScope;
      const StringAlias = typeAlias.body.get("StringAlias");
      expect(errors.length).toBe(0);
      expect(StringAlias === Type.find("''")).toBe(true);
    });
    test("Null literal type alias", async () => {
      const sourceAST = prepareAST(`
        type NullAlias = null;
      `);
      const [[actual], errors] = await createTypeGraph([sourceAST]);
      const typeAlias = actual.typeScope;
      expect(errors.length).toBe(0);
      expect(typeAlias.body.get("NullAlias") === Type.Null).toBe(true);
    });
    test("Generic type alias", async () => {
      const sourceAST = prepareAST(`
        type A<T> = T;
        type B = A<number>;
     `);
      const [[actual], errors] = await createTypeGraph([sourceAST]);
      const typeAlias = actual.typeScope;
      const A = typeAlias.body.get("A");
      const B = typeAlias.body.get("B");
      expect(errors.length).toBe(0);
      expect(A).toBeInstanceOf(GenericType);
      expect(B === Type.Number).toBe(true);
    });
    test("Generic type alias with value", async () => {
      const sourceAST = prepareAST(`
        type A<T> = T;
        type B = A<number>;
        const b: B = 2;
      `);
      const [, errors] = await createTypeGraph([sourceAST]);
      expect(errors.length).toBe(0);
    });
    test("Generic type alias with wrong value", async () => {
      const sourceAST = prepareAST(`
        type A<T> = T;
        type B = A<number>;
        const b: B = "2";
      `);
      const [, errors] = await createTypeGraph([sourceAST]);
      expect(errors.length).toBe(1);
      expect(errors[0]).toBeInstanceOf(HegelError);
      expect(errors[0].message).toBe(
        `Type "'2'" is incompatible with type "number"`
      );
    });
  });
  describe("Object type alias", () => {
    test("Object type alias", async () => {
      const sourceAST = prepareAST(`
        type A = {
          a: number,
          b: () => number
        };
      `);
      const [[actual], errors] = await createTypeGraph([sourceAST]);
      const typeAlias = actual.typeScope;
      const A = typeAlias.body.get("A");
      expect(errors.length).toBe(0);
      expect(A).toBeInstanceOf(ObjectType);
      expect(A.properties.get("a").type === Type.Number).toBe(true);
      expect(A.properties.get("b").type === Type.find("() => number")).toBe(
        true
      );
    });
  });
  describe("Funciton type alias", () => {
    test("type alias for function", async () => {
      const sourceAST = prepareAST(`
        type a = (number, number) => string
      `);
      const [[actual], errors] = await createTypeGraph([sourceAST]);
      const typeAlias = actual.typeScope;
      const a = typeAlias.body.get("a");
      expect(errors.length).toBe(0);
      expect(a).toBeInstanceOf(FunctionType);
      expect(a === Type.find("(number, number) => string")).toBe(true);
    });
  });
});
describe("Generic types", () => {
  describe("Type alias generic types", () => {
    test("Type alias with simple generic", async () => {
      const sourceAST = prepareAST(`
         type A<T> = { a: T };
       `);
      const [[actual]] = await createTypeGraph([sourceAST]);
      const typeScope = actual.typeScope;
      const actualTypeAlias = typeScope.body.get("A");
      const T = actualTypeAlias.localTypeScope.body.get("T");
      expect(actualTypeAlias).not.toBe(undefined);
      expect(actualTypeAlias).toBeInstanceOf(GenericType);
      expect(T).not.toBe(undefined);
      expect(actualTypeAlias.subordinateType.properties.get("a").type).toBe(T);
    });
    test("Type alias with multiple generic arguments", async () => {
      const sourceAST = prepareAST(`
         type A<T, U> = { a: T, b: U };
       `);
      const [[actual]] = await createTypeGraph([sourceAST]);
      const typeScope = actual.typeScope;
      const actualTypeAlias = typeScope.body.get("A");
      const T = actualTypeAlias.localTypeScope.body.get("T");
      const U = actualTypeAlias.localTypeScope.body.get("U");
      expect(actualTypeAlias).not.toBe(undefined);
      expect(actualTypeAlias).toBeInstanceOf(GenericType);
      expect(T).not.toBe(undefined);
      expect(U).not.toBe(undefined);
      expect(actualTypeAlias.subordinateType.properties.get("a").type).toBe(T);
      expect(actualTypeAlias.subordinateType.properties.get("b").type).toBe(U);
    });
    test("Type alias with generic restriction", async () => {
      const sourceAST = prepareAST(`
         type A<T: number> = { a: T };
       `);
      const [[actual]] = await createTypeGraph([sourceAST]);
      const typeScope = actual.typeScope;
      const actualTypeAlias = typeScope.body.get("A");
      const T = actualTypeAlias.localTypeScope.body.get("T");
      expect(actualTypeAlias).not.toBe(undefined);
      expect(actualTypeAlias).toBeInstanceOf(GenericType);
      expect(T.constraint === Type.Number).toBe(true);
      expect(actualTypeAlias.subordinateType.properties.get("a").type).toBe(T);
    });
  });
  describe("Function generic types", () => {
    test("Function declaration with simple generic", async () => {
      const sourceAST = prepareAST(`
        function a<T>(b: T): T { return b; }
      `);
      const [[actual]] = await createTypeGraph([sourceAST]);
      const actualFunctionType = actual.body.get("a").type;
      expect(actualFunctionType).not.toBe(undefined);
      expect(actualFunctionType).toBeInstanceOf(GenericType);
      expect(actualFunctionType.name).toBe("<T>(T) => T");
      expect(actualFunctionType.localTypeScope.body.get("T")).not.toBe(
        undefined
      );
    });
    test("Function declaration multiple generic arguments", async () => {
      const sourceAST = prepareAST(`
          function a<T, U>(b: T, c: U): U { return c; }
        `);
      const [[actual]] = await createTypeGraph([sourceAST]);
      const actualFunctionType = actual.body.get("a").type;
      expect(actualFunctionType).not.toBe(undefined);
      expect(actualFunctionType).toBeInstanceOf(GenericType);
      expect(actualFunctionType.name).toBe("<T, U>(T, U) => U");
      expect(actualFunctionType.localTypeScope.body.get("T")).not.toBe(
        undefined
      );
      expect(actualFunctionType.localTypeScope.body.get("U")).not.toBe(
        undefined
      );
    });
    test("Function declaration with generic restriction", async () => {
      const sourceAST = prepareAST(`
          function a<T: string>(b: T): T { return b; }
        `);
      const [[actual]] = await createTypeGraph([sourceAST]);
      const actualFunction = actual.body.get("a").type;
      expect(actualFunction).not.toBe(undefined);
      expect(actualFunction).toBeInstanceOf(GenericType);
      expect(actualFunction.subordinateType.argumentsTypes[0].constraint).toBe(
        Type.String
      );
      expect(actualFunction.subordinateType.returnType.constraint).toBe(
        Type.String
      );
    });
    test("Function type alias with generic", async () => {
      const sourceAST = prepareAST(`
          type A = <T>(T) => T;
        `);
      const [[actual]] = await createTypeGraph([sourceAST]);
      const typeScope = actual.typeScope;
      const actualFunctionType = typeScope.body.get("A");
      const actualTypeT = actualFunctionType.localTypeScope.body.get("T");
      expect(actualFunctionType).not.toBe(undefined);
      expect(actualTypeT).not.toBe(undefined);
    });
    test("Simple typed function type equalence", async () => {
      const sourceAST = prepareAST(`
        type Id = <T>(T) => T;
        const id: Id = x => x;
      `);
      const [[actual], errors] = await createTypeGraph([sourceAST]);
      const typeScope = actual.typeScope;
      const idTypeAlias = typeScope.body.get("Id");
      const actualFunction = actual.body.get("id");
      expect(errors.length).toEqual(0);
      expect(actualFunction.type).toBe(idTypeAlias);
    });
  });
  describe("Recursive types", () => {
    test("Simple recursive Tree types", async () => {
      const sourceAST = prepareAST(`
           type Tree = {
             nodes: Array<Tree>,
             parent: ?Tree
           }
         `);
      const [[actual]] = await createTypeGraph(
        [sourceAST],
        getModuleAST,
        false,
        mixTypeDefinitions()
      );
      const typeScope = actual.typeScope;
      const actualType = typeScope.body.get("Tree");
      expect(actualType.name).toBe(
        "{ nodes: Array<Tree>, parent: Tree | undefined }"
      );
      expect(
        actualType.properties.get("nodes").type.valueType.equalsTo(actualType)
      ).toBe(true);
    });
  });
  describe("Union types", () => {
    test("Union type for variable", async () => {
      const sourceAST = prepareAST(`
          const a: number | string = 2;
        `);
      const [[actual]] = await createTypeGraph([sourceAST]);
      const aType = actual.body.get("a").type;
      expect(aType).toBeInstanceOf(UnionType);
      expect(aType === Type.find("number | string")).toBe(true);
    });
    test("Union type in type alias", async () => {
      const sourceAST = prepareAST(`
          type A = string | number;
        `);
      const [[actual]] = await createTypeGraph([sourceAST]);
      const actualTypeScope = actual.typeScope;
      const actualAType = actualTypeScope.body.get("A");
      expect(actualAType).toBeInstanceOf(UnionType);
      expect(actualAType === Type.find("number | string")).toBe(true);
    });
    test("Union type as argument type", async () => {
      const sourceAST = prepareAST(`
        function a(b: string | number): undefined {}
      `);
      const [[actual]] = await createTypeGraph([sourceAST]);
      const actualAFunctionScope = actual.scopes.get("[[Scope2-8]]");
      const actualADeclarationInfo = actual.body.get("a");
      const actualBArgumentInfo = actualAFunctionScope.body.get("b");
      const actualArgumentDeclarationInfo =
        actualADeclarationInfo.type.argumentsTypes[0];
      expect(actualBArgumentInfo.type === Type.find("number | string")).toBe(
        true
      );
      expect(actualArgumentDeclarationInfo).toBe(actualBArgumentInfo.type);
    });
    test("Union type as return type", async () => {
      const sourceAST = prepareAST(`
          function a(): string | number {}
        `);
      const [[actual]] = await createTypeGraph([sourceAST]);
      const actualADeclarationInfo = actual.body.get("a");
      const actualReturnInfo = actualADeclarationInfo.type.returnType;
      expect(actualReturnInfo === Type.find("number | string")).toBe(true);
    });
  });
});

describe("Classes", () => {
  test("Simple class declaration", async () => {
    const sourceAST = prepareAST(`
       class A {}
     `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    const typeScope = actual.typeScope;
    const actualAType = typeScope.body.get("A");
    const actualAClass = actual.body.get("A").type;
    expect(actualAClass.properties.get(CONSTRUCTABLE).type.returnType).toBe(
      actualAType
    );
  });
  test("Simple class declaration with constructor", async () => {
    const sourceAST = prepareAST(`
       class A {
         a: number;

         constructor(a: number) {
           this.a = a;
         }
       }
     `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    const typeScope = actual.typeScope;
    const actualAType = typeScope.body.get("A");
    const actualAClass = actual.body.get("A").type;
    expect(actualAClass.properties.get(CONSTRUCTABLE).type.returnType).toBe(
      actualAType
    );
    expect(
      actualAClass.properties.get(CONSTRUCTABLE).type.argumentsTypes.length
    ).toBe(1);
    expect(
      actualAClass.properties.get(CONSTRUCTABLE).type.argumentsTypes[0]
    ).toBe(Type.Number);
  });
  test("Simple class declaration with extends", async () => {
    const sourceAST = prepareAST(`
      class B {}
      class A extends B {}
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    const typeScope = actual.typeScope;
    const actualAType = typeScope.body.get("A");
    const actualAClass = actual.body.get("A").type;
    const actualBType = typeScope.body.get("B");
    const actualBClass = actual.body.get("B").type;
    expect(actualAClass.properties.get(CONSTRUCTABLE).type.returnType).toBe(
      actualAType
    );
    expect(actualBClass.properties.get(CONSTRUCTABLE).type.returnType).toBe(
      actualBType
    );
    expect(actualAType.isSubtypeOf).toBe(actualBType);
  });

  test("Get concat method of tuple", async () => {
    const sourceAST = prepareAST(`
      const a: [number, string] = [2, '2']; 
      const b = a.concat([2]); 
    `);
    const [[module], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const b = module.body.get("b");
    expect(errors.length).toEqual(0);
    expect(b).not.toBe(undefined);
    expect(b.type).toBeInstanceOf(CollectionType);
    expect(b.type === Type.find("Array<number | string>")).toBe(true);
  });
});
describe("Promises", () => {
  test("Await undefined value", async () => {
    const sourceAST = prepareAST(`
      const a = Promise.resolve();
      async function b() {
        const c = await a;
      }
    `);
    const [[module], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const a = module.body.get("a");
    const b = module.body.get("b");
    const bScope = module.scopes.get("[[Scope3-6]]");
    const c = bScope.body.get("c");
    expect(errors.length).toEqual(0);
    expect(a).not.toBe(undefined);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type === Type.find("Promise<undefined>")).toBe(true);
    expect(b).not.toBe(undefined);
    expect(b.type).toBeInstanceOf(FunctionType);
    expect(b.type === Type.find("async () => Promise<undefined>")).toBe(true);
    expect(c).not.toBe(undefined);
    expect(c.type).toBeInstanceOf(Type);
    expect(c.type === Type.Undefined).toBe(true);
  });
  test("Await number value", async () => {
    const sourceAST = prepareAST(`
      const a = Promise.resolve(2);
      async function b() {
        const c = await a;
      } 
    `);
    const [[module], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const a = module.body.get("a");
    const b = module.body.get("b");
    const bScope = module.scopes.get("[[Scope3-6]]");
    const c = bScope.body.get("c");
    expect(errors.length).toEqual(0);
    expect(a).not.toBe(undefined);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type === Type.find("Promise<2>")).toBe(true);
    expect(b).not.toBe(undefined);
    expect(b.type).toBeInstanceOf(FunctionType);
    expect(b.type === Type.find("async () => Promise<undefined>")).toBe(true);
    expect(c).not.toBe(undefined);
    expect(c.type).toBeInstanceOf(Type);
    expect(c.type === Type.find(2)).toBe(true);
  });
});
describe("Issues", () => {
  test("Simple separated export notation", async () => {
    const sourceAST = prepareAST(`
      function hello() {}
      export {hello}
    `);
    const [[currentModule], errors] = await createTypeGraph([sourceAST]);
    const hello = currentModule.exports.get("hello");
    expect(errors.length).toEqual(0);
    expect(hello).not.toBe(undefined);
    expect(hello).toBeInstanceOf(VariableInfo);
    expect(hello.type).toBeInstanceOf(FunctionType);
    expect(hello.type === Type.find("() => undefined")).toBe(true);
    expect(hello.type.argumentsTypes.length).toBe(0);
    expect(hello.type.returnType === Type.Undefined).toBe(true);
  });
  test("Hoisted separated export notation", async () => {
    const sourceAST = prepareAST(`
      export {hello}
      function hello() {}
    `);
    const [[currentModule], errors] = await createTypeGraph([sourceAST]);
    const hello = currentModule.exports.get("hello");
    expect(errors.length).toEqual(0);
    expect(hello).not.toBe(undefined);
    expect(hello).toBeInstanceOf(VariableInfo);
    expect(hello.type).toBeInstanceOf(FunctionType);
    expect(hello.type === Type.find("() => undefined")).toBe(true);
    expect(hello.type.argumentsTypes.length).toBe(0);
    expect(hello.type.returnType === Type.Undefined).toBe(true);
  });
  test("Named separated export notation", async () => {
    const sourceAST = prepareAST(`
      function hello() {}
      export { hello as hello1 }
    `);
    const [[currentModule], errors] = await createTypeGraph([sourceAST]);
    const hello1 = currentModule.exports.get("hello1");
    expect(errors.length).toEqual(0);
    expect(hello1).not.toBe(undefined);
    expect(hello1).toBeInstanceOf(VariableInfo);
    expect(hello1.type).toBeInstanceOf(FunctionType);
    expect(hello1.type === Type.find("() => undefined")).toBe(true);
    expect(hello1.type.argumentsTypes.length).toBe(0);
    expect(hello1.type.returnType === Type.Undefined).toBe(true);
  });
  test("Simple separated type export notation", async () => {
    const sourceAST = prepareAST(`
      type Hello = number;
      export type { Hello }
    `);
    const [[currentModule], errors] = await createTypeGraph([sourceAST]);
    const Hello = currentModule.exportsTypes.get("Hello");
    expect(errors.length).toEqual(0);
    expect(Hello).not.toBe(undefined);
    expect(Hello).toBeInstanceOf(Type);
    expect(Hello === Type.Number).toBe(true);
  });
  test("Simple separated type export notation", async () => {
    const sourceAST = prepareAST(`
      type Hello = number;
      export type { Hello as Renamed }
    `);
    const [[currentModule], errors] = await createTypeGraph([sourceAST]);
    const Renamed = currentModule.exportsTypes.get("Renamed");
    expect(errors.length).toEqual(0);
    expect(Renamed).not.toBe(undefined);
    expect(Renamed).toBeInstanceOf(Type);
    expect(Renamed === Type.Number).toBe(true);
  });
  test("Issue #116: Partial type should not be soft", async () => {
    const sourceAST = prepareAST(`
      const obj: { a: ?number } = { test: 3 }; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0]).toBeInstanceOf(HegelError);
    expect(errors[0].message).toBe(
      'Type "{ test: 3 }" is incompatible with type "{ a: number | undefined }"'
    );
    expect(errors[0].loc).toEqual({
       end:  {
         column: 45,
         line: 2,
       },
       start: {
         column: 12,
         line: 2,
       },
    });
  });
});
