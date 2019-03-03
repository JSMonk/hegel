const prepareAST = require("./preparation");
const createTypeGraph = require("../build/type-graph/type-graph").default;
const { Type } = require("../build/type-graph/types/type");
const { TypeVar } = require("../build/type-graph/types/type-var");
const { TupleType } = require("../build/type-graph/types/tuple-type");
const { UnionType } = require("../build/type-graph/types/union-type");
const { ObjectType } = require("../build/type-graph/types/object-type");
const { TYPE_SCOPE } = require("../build/type-graph/constants");
const { GenericType } = require("../build/type-graph/types/generic-type");
const { FunctionType } = require("../build/type-graph/types/function-type");
const { VariableInfo } = require("../build/type-graph/variable-info");
const { CollectionType } = require("../build/type-graph/types/collection-type");

describe("Simple inference for module variables by literal", () => {
  test("Inference global module variable with number type", async () => {
    const sourceAST = prepareAST(`
      const a = 2;
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("number"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with boolean type", async () => {
    const sourceAST = prepareAST(`
      const a = true;
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("boolean"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with string type", async () => {
    const sourceAST = prepareAST(`
      const a = "test";
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("string"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with null type", async () => {
    const sourceAST = prepareAST(`
      const a = null;
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type(null, { isLiteralOf: new Type("void") }),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with undefined type", async () => {
    const sourceAST = prepareAST(`
      const a = undefined;
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("undefined", { isLiteralOf: new Type("void") }),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with object type", async () => {
    const sourceAST = prepareAST(`
      const a = {};
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new ObjectType("{  }", []),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with empty array type", async () => {
    const sourceAST = prepareAST(`
      const a = [];
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new TupleType("[]", []),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with single item array type", async () => {
    const sourceAST = prepareAST(`
      const a = [2];
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new TupleType("[number]", [new Type("number")]),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with multy items array type", async () => {
    const sourceAST = prepareAST(`
      const a = [2, "2"];
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new TupleType("[number, string]", [
        new Type("number"),
        new Type("string")
      ]),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module object property type", async () => {
    const sourceAST = prepareAST(`
      const a = { a: 1 };
      const b = a.a;
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("number"),
      parent: actual
    });
    expect(actual.body.get("b")).toEqual(expected);
  });
});
describe("Simple inference for module variables by function return", () => {
  test("Inference global module variable with number type", async () => {
    const sourceAST = prepareAST(`
      function getA(): number {
        return 2;
      }
      const a = getA();
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("number"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with boolean type", async () => {
    const sourceAST = prepareAST(`
      function getA(): boolean {
        return false;
      }
      const a = getA();
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("boolean"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with string type", async () => {
    const sourceAST = prepareAST(`
      function getA(): string {
        return "test";
      }
      const a = getA();
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("string"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with null type", async () => {
    const sourceAST = prepareAST(`
      function getA(): null {
        return null;
      }
      const a = getA();
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type(null, { isLiteralOf: new Type("void") }),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with undefined type", async () => {
    const sourceAST = prepareAST(`
      function getA(): undefined {}
      const a = getA();
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("undefined", { isLiteralOf: new Type("void") }),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with void type", async () => {
    const sourceAST = prepareAST(`
      function getA(): void {
      }
      const a = getA();
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("void"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with mixed type", async () => {
    const sourceAST = prepareAST(`
      function getA(): mixed {
      }
      const a = getA();
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("mixed"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with union type", async () => {
    const sourceAST = prepareAST(`
      function getA(): string | number {
        return 2;
      }
      const a = getA();
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new UnionType("number | string", [
        new Type("number"),
        new Type("string")
      ]),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with tuple type", async () => {
    const sourceAST = prepareAST(`
      function getA(): [string, number] {
        return 2;
      }
      const a = getA();
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new TupleType("[string, number]", [
        new Type("string"),
        new Type("number")
      ]),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with nullable type", async () => {
    const sourceAST = prepareAST(`
      function getA(): ?number {
        return 2;
      }
      const a = getA();
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new UnionType("number | void", [
        new Type("number"),
        new Type("void")
      ]),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with object type", async () => {
    const sourceAST = prepareAST(`
      function getA(): { a: number } {
        return { a: 2 };
      }
      const a = getA();
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new ObjectType("{ a: number }", [
        ["a", new VariableInfo(new Type("number"), actual)]
      ]),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with alias type", async () => {
    const sourceAST = prepareAST(`
      type A = { a: number }
      function getA(): A {
        return { a: 2 };
      }
      const a = getA();
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new ObjectType("{ a: number }", [
        ["a", new VariableInfo(new Type("number"), actual)]
      ]),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with generic alias type", async () => {
    const sourceAST = prepareAST(`
      type A<T> = { a: T }
      function getA(): A<number> {
        return { a: 2 };
      }
      const a = getA();
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new ObjectType("{ a: number }", [
        ["a", new VariableInfo(new Type("number"), actual)]
      ]),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
});
describe("Simple inference for module functions", () => {
  test("Inference global module function arguments", async () => {
    const sourceAST = prepareAST(`
      function a(b): void {
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => void");
    expect(actualA.type.subordinateType.returnType).toEqual(new Type("void"));
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α")
    ]);
  });
  test("Inference global module function without return type", async () => {
    const sourceAST = prepareAST(`
      function a() {
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => void");
    expect(actualA.type.returnType).toEqual(new Type("void"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function by single return type", async () => {
    const sourceAST = prepareAST(`
      function a() {
      	return 2;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function return type by free variable return", async () => {
    const sourceAST = prepareAST(`
			const x: string = "test";
      function a() {
      	return x;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => string");
    expect(actualA.type.returnType).toEqual(new Type("string"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function type", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
      	return x;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => α");
    expect(actualA.type.subordinateType.returnType).toEqual(new TypeVar("α"));
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α")
    ]);
  });
  test("Inference global module function type by arguments usage", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
      	return x - 2;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments usage", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
				return () => x - 2;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => () => number");
    expect(actualA.type.returnType).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
        const b = x;
        return b - 2;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link inside inner function", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
        const f = () => {
          const b = x;
          return b - 2;
        };
        return f();
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link inside deep nested function", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
        const f = () => {
          const f1 = () => {
            const f2 = () => x - 4; 
          };
          return "test";
        };
        return f();
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => string");
    expect(actualA.type.returnType).toEqual(new Type("string"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference function local variable type", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
        const b = 2;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualAScope = actual.body.get("[[Scope2-6]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
  });
  test("Inference function local variable type by argument link", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
        const b = x;
        return x - 2;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualAScope = actual.body.get("[[Scope2-6]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
  });
  test("Inference function local variable type by nested function usage", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
        const b = x;
        const fn = () => {
          const c = b;
          return c - 2;
        }
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualAScope = actual.body.get("[[Scope2-6]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
    expect(actualAScope.body.get("x").type).toEqual(new Type("number"));
    expect(actualAScope.body.get("fn").type).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
  });
  test("Inference global module function arguments inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function(b): void {
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => void");
    expect(actualA.type.subordinateType.returnType).toEqual(new Type("void"));
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α")
    ]);
  });
  test("Inference global module function without return type inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function () {
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => void");
    expect(actualA.type.returnType).toEqual(new Type("void"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function by single return type inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function () {
      	return 2;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function return type by free variable return inside function expression", async () => {
    const sourceAST = prepareAST(`
			const x: string = "test";
      const a = function () {
      	return x;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => string");
    expect(actualA.type.returnType).toEqual(new Type("string"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function type inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
      	return x;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => α");
    expect(actualA.type.subordinateType.returnType).toEqual(new TypeVar("α"));
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α")
    ]);
  });
  test("Inference global module function type by arguments usage inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
      	return x - 2;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments usage inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
				return () => x - 2;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => () => number");
    expect(actualA.type.returnType).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
        const b = x;
        return b - 2;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link inside inner function inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
        const f = () => {
          const b = x;
          return b - 2;
        };
        return f();
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link inside deep nested function inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
        const f = () => {
          const f1 = () => {
            const f2 = () => x - 4; 
          };
          return "test";
        };
        return f();
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => string");
    expect(actualA.type.returnType).toEqual(new Type("string"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference function local variable type inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
        const b = 2;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualAScope = actual.body.get("[[Scope2-16]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
  });
  test("Inference function local variable type by argument link inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
        const b = x;
        return x - 2;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualAScope = actual.body.get("[[Scope2-16]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
  });
  test("Inference function local variable type by nested function usage inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
        const b = x;
        const fn = () => {
          const c = b;
          return c - 2;
        }
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualAScope = actual.body.get("[[Scope2-16]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
    expect(actualAScope.body.get("x").type).toEqual(new Type("number"));
    expect(actualAScope.body.get("fn").type).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
  });
  test("Inference global module function arguments inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = (b): void => {
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => void");
    expect(actualA.type.subordinateType.returnType).toEqual(new Type("void"));
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α")
    ]);
  });
  test("Inference global module function without return type inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = () => {
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => void");
    expect(actualA.type.returnType).toEqual(new Type("void"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function by single return 1 type inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = () => {
      	return 2;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function by single return 2 type inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = () => 2
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function return type by free variable return 1 inside arrow function", async () => {
    const sourceAST = prepareAST(`
			const x: string = "test";
      const a = () => {
      	return x;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => string");
    expect(actualA.type.returnType).toEqual(new Type("string"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function return type by free variable return 2 inside arrow function", async () => {
    const sourceAST = prepareAST(`
			const x: string = "test";
      const a = () => x;
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => string");
    expect(actualA.type.returnType).toEqual(new Type("string"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function type 1 inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => {
      	return x;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => α");
    expect(actualA.type.subordinateType.returnType).toEqual(new TypeVar("α"));
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α")
    ]);
  });
  test("Inference global module function type 2 inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => x;
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => α");
    expect(actualA.type.subordinateType.returnType).toEqual(new TypeVar("α"));
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α")
    ]);
  });
  test("Inference global module function type by arguments usage 1 inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => {
        return x - 2
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by arguments usage 2 inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => x - 2
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments usage 1 inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = (x) => {
				return () => x - 2;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => () => number");
    expect(actualA.type.returnType).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments usage 2 inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => () => x - 2;
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => () => number");
    expect(actualA.type.returnType).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => {
        const b = x;
        return b - 2;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link inside inner function inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => {
        const f = () => {
          const b = x;
          return b - 2;
        };
        return f();
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link inside deep nested function inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x  => {
        const f = () => {
          const f1 = () => {
            const f2 = () => x - 4; 
          };
          return "test";
        };
        return f();
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => string");
    expect(actualA.type.returnType).toEqual(new Type("string"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference function local variable type inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => {
        const b = 2;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualAScope = actual.body.get("[[Scope2-16]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
  });
  test("Inference function local variable type by argument link inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => {
        const b = x;
        return x - 2;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualAScope = actual.body.get("[[Scope2-16]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
  });
  test("Inference function local variable type by nested function usage inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => {
        const b = x;
        const fn = () => {
          const c = b;
          return c - 2;
        }
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualAScope = actual.body.get("[[Scope2-16]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
    expect(actualAScope.body.get("x").type).toEqual(new Type("number"));
    expect(actualAScope.body.get("fn").type).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
  });
});
describe("Object type inference", () => {
  test("Inference object type with all simple types", async () => {
    const sourceAST = prepareAST(`
      const a = {
        1: 1,
        2: "2",
        3: true,
        4: null,
        5: undefined,
        6: /da/gi
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a").type;
    expect(actualA.properties.get("1").type).toEqual(new Type("number"));
    expect(actualA.properties.get("2").type).toEqual(new Type("string"));
    expect(actualA.properties.get("3").type).toEqual(new Type("boolean"));
    expect(actualA.properties.get("4").type).toEqual(
      new Type(null, { isLiteralOf: new Type("void") })
    );
    expect(actualA.properties.get("5").type).toEqual(
      new Type("undefined", { isLiteralOf: new Type("void") })
    );
    expect(actualA.properties.get("6").type).toEqual(
      new ObjectType("RegExp", [])
    );
    expect(actualA.name).toEqual(
      "{ 1: number, 2: string, 3: boolean, 4: null, 5: undefined, 6: RegExp }"
    );
  });
  test("Inference object type with all function types", async () => {
    const sourceAST = prepareAST(`
      const a = {
        a() { return 2 },
        b: function(a) {},
        c: x => x
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a").type;
    expect(actualA.properties.get("a").type).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
    expect(actualA.properties.get("b").type.subordinateType).toEqual(
      new FunctionType("<α>(α) => void", [new TypeVar("α")], new Type("void"))
    );
    expect(actualA.properties.get("c").type.subordinateType).toEqual(
      new FunctionType("<α>(α) => α", [new TypeVar("α")], new TypeVar("α"))
    );
    expect(actualA.name).toEqual(
      "{ a: () => number, b: <α>(α) => void, c: <α>(α) => α }"
    );
  });
  test("Inference object type with nested object", async () => {
    const sourceAST = prepareAST(`
      const a = {
        b: { c: () => 2 }
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a").type;
    expect(actualA.properties.get("b").type.properties.get("c").type).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
    expect(actualA.name).toEqual("{ b: { c: () => number } }");
  });
});

describe("Error inference", () => {
  test("Inference simple throw", async () => {
    const sourceAST = prepareAST(`
      try {
        throw new Error("");
      } catch(e) {}
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(actualE.type).toEqual(
      new ObjectType("{ message: string }", [
        ["message", new VariableInfo(new Type("string"))]
      ])
    );
  });
  test("Inference simple throw with SyntaxError", async () => {
    const sourceAST = prepareAST(`
      try {
        throw new SyntaxError("test");
      } catch(e) {}
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(actualE.type).toEqual(
      new ObjectType("{ message: string }", [
        ["message", new VariableInfo(new Type("string"))]
      ])
    );
  });
  test("Inference simple throw with primitive type", async () => {
    const sourceAST = prepareAST(`
      try {
        throw 2;
      } catch(e) {}
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(actualE.type).toEqual(new Type("number"));
  });
  test("Inference simple throw with object type", async () => {
    const sourceAST = prepareAST(`
      try {
        throw { message: "test" };
      } catch(e) {}
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(actualE.type).toEqual(
      new ObjectType("{ message: string }", [
        ["message", new VariableInfo(new Type("string"))]
      ])
    );
  });
  test("Inference simple throw with anonymous function type", async () => {
    const sourceAST = prepareAST(`
      try {
        throw function() {};
      } catch(e) {}
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(actualE.type).toEqual(
      new FunctionType("() => void", [], new Type("void"))
    );
  });
  test("Inference simple throw new with anonymous function type", async () => {
    const sourceAST = prepareAST(`
      try {
        throw new function() {};
      } catch(e) {}
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(actualE.type).toEqual(new ObjectType("{ }", []));
  });
  test("Inference simple throw relation in catch", async () => {
    const sourceAST = prepareAST(`
      try {
        throw 2;
      } catch(e) {
        const a = e;
      }
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const actualE = actualCatchScope.body.get("a");
    expect(actualE.type).toEqual(new Type("number"));
  });
  test("Inference function call with throw", async () => {
    const sourceAST = prepareAST(`
      function a() {
        throw 2;
      }
      try {
        a();
      } catch(e) {}
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope7-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(actualE.type).toEqual(new Type("number"));
  });
  test("Inference function call with conditional throw", async () => {
    const sourceAST = prepareAST(`
      function a() {
        if (true)
          throw 2;
      }
      try {
        a();
      } catch(e) {}
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope8-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(actualE.type).toEqual(new Type("number"));
  });
  test("Inference function call with implicit throw", async () => {
    const sourceAST = prepareAST(`
      function a() {
        if (true)
          throw 2;
      }
      function b() { a(); }
      try {
        b();
      } catch(e) {}
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope9-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(actualE.type).toEqual(new Type("number"));
  });
});
describe("Collection type inference", () => {
  test("Simple inference of array type", async () => {
    const sourceAST = prepareAST(`
      const arr: Array<number> = [];
      const a = arr[0];
    `);
    const [[actual]] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(actualA.type).toEqual(
      new UnionType("number | void", [new Type("number"), new Type("void")])
    );
  });
  test("Simple inference of array type", async () => {
    const sourceAST = prepareAST(`
      const arr: Array<number> = [];
      const a = arr["0"];
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(1);
    expect(errors[0].message).toEqual(
      'Property "0" are not exists in "{ [key: number]: number }"'
    );
  });
});
