const HegelError = require("../build/utils/errors").default;
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
const {
  prepareAST,
  getModuleAST,
  mixTypeDefinitions
} = require("./preparation");

describe("Simple inference for module variables by literal", () => {
  test("Inference global module variable with number type", async () => {
    const sourceAST = prepareAST(`
      const a = 2;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("number"),
      parent: actual
    });
    expect(errors.length).toBe(0);
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with boolean type", async () => {
    const sourceAST = prepareAST(`
      const a = true;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("boolean"),
      parent: actual
    });
    expect(errors.length).toBe(0);
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with string type", async () => {
    const sourceAST = prepareAST(`
      const a = "test";
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("string"),
      parent: actual
    });
    expect(errors.length).toBe(0);
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with null type", async () => {
    const sourceAST = prepareAST(`
      const a = null;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type(null, { isSubtypeOf: new Type("void") }),
      parent: actual
    });
    expect(errors.length).toBe(0);
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with undefined type", async () => {
    const sourceAST = prepareAST(`
      const a = undefined;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("undefined", { isSubtypeOf: new Type("void") }),
      parent: actual
    });
    expect(errors.length).toBe(0);
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with object type", async () => {
    const sourceAST = prepareAST(`
      const a = {};
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new ObjectType("{  }", []),
      parent: actual
    });
    expect(errors.length).toBe(0);
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with empty array type", async () => {
    const sourceAST = prepareAST(`
      const a = [];
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      await mixTypeDefinitions(createTypeGraph)
    );
    const expected = expect.objectContaining({
      type: new TupleType("[]", []),
      parent: actual
    });
    const a = actual.body.get("a").type;
    expect(errors.length).toBe(0);
    expect(a).toBeInstanceOf(TupleType);
    expect(a.name).toBe("[]");
    expect(a.items).toEqual([]);
  });
  test("Inference global module variable with single item array type", async () => {
    const sourceAST = prepareAST(`
      const a = [2];
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      await mixTypeDefinitions(createTypeGraph)
    );
    const a = actual.body.get("a").type;
    expect(errors.length).toBe(0);
    expect(a).toBeInstanceOf(TupleType);
    expect(a.name).toBe("[number]");
    expect(a.items).toEqual([new Type("number")]);
  });
  test("Inference global module variable with multy items array type", async () => {
    const sourceAST = prepareAST(`
      const a = [2, "2"];
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      await mixTypeDefinitions(createTypeGraph)
    );
    const a = actual.body.get("a").type;
    expect(errors.length).toBe(0);
    expect(a).toBeInstanceOf(TupleType);
    expect(a.name).toBe("[number, string]");
    expect(a.items).toEqual([new Type("number"), new Type("string")]);
  });
  test("Inference global module object property type", async () => {
    const sourceAST = prepareAST(`
      const a = { a: 1 };
      const b = a.a;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("number"),
      parent: actual
    });
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("number"),
      parent: actual
    });
    expect(errors.length).toBe(0);
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with boolean type", async () => {
    const sourceAST = prepareAST(`
      function getA(): boolean {
        return false;
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("boolean"),
      parent: actual
    });
    expect(errors.length).toBe(0);
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with string type", async () => {
    const sourceAST = prepareAST(`
      function getA(): string {
        return "test";
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("string"),
      parent: actual
    });
    expect(errors.length).toBe(0);
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with null type", async () => {
    const sourceAST = prepareAST(`
      function getA(): null {
        return null;
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type(null, { isSubtypeOf: new Type("void") }),
      parent: actual
    });
    expect(errors.length).toBe(0);
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with undefined type", async () => {
    const sourceAST = prepareAST(`
      function getA(): undefined {}
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("undefined", { isSubtypeOf: new Type("void") }),
      parent: actual
    });
    expect(errors.length).toBe(0);
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with void type", async () => {
    const sourceAST = prepareAST(`
      function getA(): void {
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("void"),
      parent: actual
    });
    expect(errors.length).toBe(0);
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with mixed type", async () => {
    const sourceAST = prepareAST(`
      function getA(): mixed {
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new Type("mixed"),
      parent: actual
    });
    expect(errors.length).toBe(0);
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with union type", async () => {
    const sourceAST = prepareAST(`
      function getA(): string | number {
        return 2;
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new UnionType("number | string", [
        new Type("number"),
        new Type("string")
      ]),
      parent: actual
    });
    expect(errors.length).toBe(0);
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with tuple type", async () => {
    const sourceAST = prepareAST(`
      function getA(): [string, number] {
        return ["", 2];
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      await mixTypeDefinitions(createTypeGraph)
    );
    const a = actual.body.get("a").type;
    expect(errors.length).toBe(0);
    expect(a).toBeInstanceOf(TupleType);
    expect(a.name).toBe("[string, number]");
    expect(a.items).toEqual([new Type("string"), new Type("number")]);
  });
  test("Inference global module variable with nullable type", async () => {
    const sourceAST = prepareAST(`
      function getA(): ?number {
        return 2;
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new UnionType("number | undefined", [
        new Type("number"),
        new Type("undefined", { isSubtypeOf: new Type("void") })
      ])
    });
    expect(errors.length).toBe(0);
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with object type", async () => {
    const sourceAST = prepareAST(`
      function getA(): { a: number } {
        return { a: 2 };
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new ObjectType("{ a: number }", [
        ["a", new VariableInfo(new Type("number"), actual)]
      ]),
      parent: actual
    });
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new ObjectType("{ a: number }", [
        ["a", new VariableInfo(new Type("number"), actual)]
      ]),
      parent: actual
    });
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const expected = expect.objectContaining({
      type: new ObjectType("{ a: number }", [
        ["a", new VariableInfo(new Type("number"), actual)]
      ]),
      parent: actual
    });
    expect(errors.length).toBe(0);
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference function with default paramter and type", async () => {
    const sourceAST = prepareAST(`
      const fn = (a: number = 1) => a;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(actual.body.get("fn").type).toEqual(
      new FunctionType(
        "(number) => number",
        [new Type("number")],
        new Type("number")
      )
    );
  });
});
describe("Simple inference for module functions", () => {
  test("Inference global module function arguments", async () => {
    const sourceAST = prepareAST(`
      function a(b): void {
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => void");
    expect(actualA.type.subordinateType.returnType).toEqual(new Type("void"));
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α", undefined)
    ]);
  });
  test("Inference global module function without return type", async () => {
    const sourceAST = prepareAST(`
      function a() {
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => α");
    expect(actualA.type.subordinateType.returnType).toEqual(
      new TypeVar("α", undefined)
    );
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α", undefined)
    ]);
  });
  test("Inference global module function type by arguments usage", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
      	return x - 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => () => number");
    expect(actualA.type.returnType).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by arguments usage", async () => {
    const sourceAST = prepareAST(`
      function mul(a, b) {
        return a * b;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("mul");
    const expectedT = new TypeVar(
      "T",
      new UnionType("bigint | number", [
        new Type("bigint"),
        new Type("number")
      ]),
    );
    expect(errors.length).toBe(0);
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<T: bigint | number>(T, T) => T");
    expect(actualA.type.subordinateType.returnType).toEqual(expectedT);
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      expectedT,
      expectedT
    ]);
  });
  test("Inference global module function type by multiple arguments usage", async () => {
    const sourceAST = prepareAST(`
      const rol = (x, i) => (x << i) | (x >>> (32 - i));
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("rol");
    expect(errors.length).toBe(0);
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number, number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([
      new Type("number"),
      new Type("number")
    ]);
  });
  test("Inference global module function type by inner function arguments link", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
        const b = x;
        return b - 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualAScope = actual.body.get("[[Scope2-6]]");
    expect(errors.length).toBe(0);
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
  });
  test("Inference function local variable type by argument link", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
        const b = x;
        return x - 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualAScope = actual.body.get("[[Scope2-6]]");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualAScope = actual.body.get("[[Scope2-6]]");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => void");
    expect(actualA.type.subordinateType.returnType).toEqual(new Type("void"));
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α", undefined)
    ]);
  });
  test("Inference global module function without return type inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function () {
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => α");
    expect(actualA.type.subordinateType.returnType).toEqual(
      new TypeVar("α", undefined)
    );
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α", undefined)
    ]);
  });
  test("Inference global module function type by arguments usage inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
      	return x - 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => () => number");
    expect(actualA.type.returnType).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
    expect(errors.length).toBe(0);
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
        const b = x;
        return b - 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualAScope = actual.body.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
  });
  test("Inference function local variable type by argument link inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
        const b = x;
        return x - 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualAScope = actual.body.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => void");
    expect(actualA.type.subordinateType.returnType).toEqual(new Type("void"));
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α", undefined)
    ]);
  });
  test("Inference global module function without return type inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = () => {
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function by single return 2 type inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = () => 2
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => α");
    expect(actualA.type.subordinateType.returnType).toEqual(
      new TypeVar("α", undefined)
    );
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α", undefined)
    ]);
  });
  test("Inference global module function type 2 inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => x;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => α");
    expect(actualA.type.subordinateType.returnType).toEqual(
      new TypeVar("α", undefined)
    );
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α", undefined)
    ]);
  });
  test("Inference global module function type by arguments usage 1 inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => {
        return x - 2
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by arguments usage 2 inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => x - 2
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualAScope = actual.body.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
  });
  test("Inference function local variable type by argument link inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => {
        const b = x;
        return x - 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualAScope = actual.body.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualAScope = actual.body.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
    expect(actualAScope.body.get("x").type).toEqual(new Type("number"));
    expect(actualAScope.body.get("fn").type).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
  });
  test("Inference function with default paramters", async () => {
    const sourceAST = prepareAST(`
      const fn = (a = 1) => a;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("fn").type).toEqual(
      new FunctionType(
        "(number | undefined) => number",
        [
          new UnionType("number | undefined", [
            new Type("number"),
            new Type("undefined", { isSubtypeOf: new Type("void") })
          ])
        ],
        new Type("number")
      )
    );
  });
  test("Inference function with default paramter and inner call", async () => {
    const sourceAST = prepareAST(`
      const getNum = () => 2;
      const fn = (a = getNum()) => a;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("fn").type).toEqual(
      new FunctionType(
        "(number | undefined) => number",
        [
          new UnionType("number | undefined", [
            new Type("number"),
            new Type("undefined", { isSubtypeOf: new Type("void") })
          ])
        ],
        new Type("number")
      )
    );
  });
  test("Inference function with paramter application to generic function", async () => {
    const sourceAST = prepareAST(`
      const fn = (a: number) => a;
      const res = (a, b) => fn(a + b);
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualRes = actual.body.get("res").type;
    expect(errors.length).toBe(0);
    expect(actualRes.constructor).toBe(FunctionType);
    expect(actualRes).toEqual(
      new FunctionType(
        "(number, number) => number",
        [new Type("number"), new Type("number")],
        new Type("number")
      )
    );
  });
  test("Inference function with multiple paramter application to generic function", async () => {
    const sourceAST = prepareAST(`
      const res = (a, b, c) => a * b * c;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualRes = actual.body.get("res").type;
    const expectedT = new TypeVar(
      "T",
      new UnionType("bigint | number", [
        new Type("bigint"),
        new Type("number")
      ]),
    );
    expect(errors.length).toBe(0);
    expect(actualRes.constructor).toBe(GenericType);
    expect(actualRes.name).toEqual("<T: bigint | number>(T, T, T) => T");
    expect(actualRes.subordinateType.returnType).toEqual(expectedT);
    expect(actualRes.subordinateType.argumentsTypes).toEqual([
      expectedT,
      expectedT,
      expectedT
    ]);
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
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      await mixTypeDefinitions(createTypeGraph)
    );
    const actualA = actual.body.get("a").type;
    expect(errors.length).toBe(0);
    expect(actualA.properties.get("1").type).toEqual(new Type("number"));
    expect(actualA.properties.get("2").type).toEqual(new Type("string"));
    expect(actualA.properties.get("3").type).toEqual(new Type("boolean"));
    expect(actualA.properties.get("4").type).toEqual(
      new Type(null, { isSubtypeOf: new Type("void") })
    );
    expect(actualA.properties.get("5").type).toEqual(
      new Type("undefined", { isSubtypeOf: new Type("void") })
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
      debugger;
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a").type;
    expect(errors.length).toBe(0);
    expect(actualA.properties.get("a").type).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
    expect(actualA.properties.get("b").type.subordinateType).toEqual(
      new FunctionType(
        "<α>(α) => void",
        [new TypeVar("α", undefined)],
        new Type("void")
      )
    );
    expect(actualA.properties.get("c").type.subordinateType).toEqual(
      new FunctionType(
        "<α>(α) => α",
        [new TypeVar("α", undefined)],
        new TypeVar("α", undefined)
      )
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualA = actual.body.get("a").type;
    const actualB = actualA.properties.get("b").type;
    const actualC = actualB.properties.get("c").type;
    expect(errors.length).toBe(0);
    expect(actualA).toBeInstanceOf(ObjectType);
    expect(actualA.properties.size).toBe(1);
    expect(actualA.name).toBe("{ b: { c: () => number } }");
    expect(actualB).toBeInstanceOf(ObjectType);
    expect(actualB.properties.size).toBe(1);
    expect(actualB.name).toBe("{ c: () => number }");
    expect(actualC).toBeInstanceOf(FunctionType);
    expect(actualC.argumentsTypes).toEqual([]);
    expect(actualC.returnType).toEqual(new Type("number"));
    expect(actualC.name).toBe("() => number");
  });
});

describe("Error inference", () => {
  test("Inference simple throw", async () => {
    const sourceAST = prepareAST(`
      try {
        throw new Error("");
      } catch(e) {}
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      await mixTypeDefinitions(createTypeGraph)
    );
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(actualE.type).toBeInstanceOf(ObjectType);
    expect(actualE.type.name).toBe("Error");
    expect(actualE.type.properties.get("message").type).toBeInstanceOf(Type);
    expect(actualE.type.properties.get("message").type.name).toBe("string");
  });
  test("Inference simple throw with SyntaxError", async () => {
    const sourceAST = prepareAST(`
      try {
        throw new SyntaxError("test");
      } catch(e) {}
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      await mixTypeDefinitions(createTypeGraph)
    );
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(actualE.type).toBeInstanceOf(ObjectType);
    expect(actualE.type.name).toBe("SyntaxError");
    expect(actualE.type.properties.get("message").type).toBeInstanceOf(Type);
    expect(actualE.type.properties.get("message").type.name).toBe("string");
  });
  test("Inference simple throw with primitive type", async () => {
    const sourceAST = prepareAST(`
      try {
        throw 2;
      } catch(e) {}
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(actualE.type).toEqual(new Type("number"));
  });
  test("Inference simple throw with object type", async () => {
    const sourceAST = prepareAST(`
      try {
        throw { message: "test" };
      } catch(e) {}
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(actualE.type).toBeInstanceOf(ObjectType);
    expect(actualE.type.name).toBe("{ message: string }");
    expect(actualE.type.properties.get("message").type).toBeInstanceOf(Type);
    expect(actualE.type.properties.get("message").type.name).toBe("string");
  });
  test("Inference simple throw with anonymous function type", async () => {
    const sourceAST = prepareAST(`
      try {
        throw function() {};
      } catch(e) {}
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(actualE.type).toBeInstanceOf(FunctionType);
    expect(actualE.type.name).toBe("() => void");
    expect(actualE.type.argumentsTypes).toEqual([]);
    expect(actualE.type.returnType).toEqual(new Type("void"));
  });
  test("Inference simple throw new with anonymous function type", async () => {
    const sourceAST = prepareAST(`
      try {
        throw new function() {};
      } catch(e) {}
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const actualE = actualCatchScope.body.get("a");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope7-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope8-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope9-17]]");
    const actualE = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(actualE.type).toEqual(new Type("number"));
  });
});
describe("Collection type inference", () => {
  test("Simple inference of array type", async () => {
    const sourceAST = prepareAST(`
      const arr: Array<number> = [];
      const a = arr[0];
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      await mixTypeDefinitions(createTypeGraph)
    );
    const actualA = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(actualA.type).toEqual(
      new UnionType("number | undefined", [
        new Type("number"),
        new Type("undefined")
      ])
    );
  });
  test("Simple inference of array type", async () => {
    const sourceAST = prepareAST(`
      const arr: Array<number> = [];
      const a = arr["0"];
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      await mixTypeDefinitions(createTypeGraph)
    );
    expect(errors.length).toBe(1);
    expect(errors[0].message).toEqual(
      'Property "0" are not exists in "Array<number>"'
    );
  });
});
describe("Type refinement", () => {
  test("Typeof refinement for union variable(number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | string = 2;
      if (typeof a === "number") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-33]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(new Type("number"));
  });
  test("Typeof refinement for union variable(number) in else", async () => {
    const sourceAST = prepareAST(`
      const a: number | string = 2;
      if (typeof a === "number") {
      } else {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope4-13]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(new Type("string"));
  });
  test("Typeof refinement for union variable(number) in if-else", async () => {
    const sourceAST = prepareAST(`
      const a: number | string | boolean = 2;
      if (typeof a === "number") {
      } else if (typeof a !== "string" ){
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope4-40]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(new Type("boolean"));
  });
  // test("Typeof refinement for union variable(number) in and operator", async () => {
  //   const sourceAST = prepareAST(`
  //     const a: number | string = 2;
  //     const c = typeof a === "number" && a;
  //   `);
  //   const [[actual], errors] = await createTypeGraph([sourceAST]);
  //   const actualScope = actual.body.get("[[Scope3-33]]");
  // expect(errors.length).toBe(0);
  //   expect(actualScope.body.get("b").type).toEqual(
  //     new UnionType("boolean | number", [
  //       new Type("boolean"),
  //       new Type("number")
  //     ])
  //   );
  // });
  test("Typeof refinement for union variable(string)", async () => {
    const sourceAST = prepareAST(`
      const a: number | string = 2;
      if (typeof a === "string") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-33]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(new Type("string"));
  });
  test("Typeof refinement for union variable(boolean)", async () => {
    const sourceAST = prepareAST(`
      const a: number | boolean = 2;
      if (typeof a === "boolean") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-34]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(new Type("boolean"));
  });
  test("Typeof refinement for union variable(number literal)", async () => {
    const sourceAST = prepareAST(`
      const a: 2 | string = 2;
      if (typeof a === "number") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-33]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(
      new Type(2, { isSubtypeOf: new Type("number") })
    );
  });
  test("Typeof refinement for union variable(string literal)", async () => {
    const sourceAST = prepareAST(`
      const a: "2" | number = "2";
      if (typeof a === "string") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-33]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(
      new Type("'2'", { isSubtypeOf: new Type("string") })
    );
  });
  test("Typeof refinement for union variable(boolean literal)", async () => {
    const sourceAST = prepareAST(`
      const a: true | number = true;
      if (typeof a === "boolean") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-34]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(
      new Type(true, { isSubtypeOf: new Type("boolean") })
    );
  });
  test("Typeof refinement for union variable(object)", async () => {
    const sourceAST = prepareAST(`
      const a: number | { a: number } = 2;
      if (typeof a === "object") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-33]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(
      actual.body.get(TYPE_SCOPE).body.get("{ a: number }").type
    );
  });
  test("Typeof refinement for union variable(function)", async () => {
    const sourceAST = prepareAST(`
      const a: number | () => number = 2;
      if (typeof a === "function") {
        const b = a;
      }
    `);
    const [[actual], errors, global] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-35]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toBeInstanceOf(FunctionType);
    expect(actualScope.body.get("b").type.name).toBe("() => number");
    expect(actualScope.body.get("b").type.argumentsTypes).toEqual([]);
    expect(actualScope.body.get("b").type.returnType).toEqual(
      new Type("number")
    );
  });
  test("Typeof refinement for union property(number)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: string } | { b: number, c: number } = { b: "2" };
      if (typeof a.b === "number") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-35]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(
      actual.body.get(TYPE_SCOPE).body.get("{ b: number, c: number }").type
    );
  });
  test("Typeof refinement for union property(string)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: number } | { b: string, c: number } = { b: 2 };
      if (typeof a.b === "string") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-35]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(
      actual.body.get(TYPE_SCOPE).body.get("{ b: string, c: number }").type
    );
  });
  test("Typeof refinement for union variable(boolean)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: number } | { b: boolean, c: number } = { b: 2 };
      if (typeof a.b === "boolean") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-36]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(
      actual.body.get(TYPE_SCOPE).body.get("{ b: boolean, c: number }").type
    );
  });
  test("Typeof refinement for union property(number literal)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: string } | { b: 2, c: number } = { b: "2" };
      if (typeof a.b === "number") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-35]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(
      actual.body.get(TYPE_SCOPE).body.get("{ b: 2, c: number }").type
    );
  });
  test("Typeof refinement for union property(string literal)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: number } | { b: "2", c: number } = { b: 2 };
      if (typeof a.b === "string") {
        const b = a;
      }
    `);
      debugger;
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-35]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(
      actual.body.get(TYPE_SCOPE).body.get("{ b: '2', c: number }").type
    );
  });
  test("Typeof refinement for union property(boolean literal)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: string } | { b: true, c: number } = { b: "2" };
      if (typeof a.b === "boolean") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-36]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(
      actual.body.get(TYPE_SCOPE).body.get("{ b: true, c: number }").type
    );
  });
  test("Typeof refinement for union variable(object)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: number } | { b: { d: number }, c: number } = { b: 2 };
      if (typeof a.b === "object") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-35]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(
      actual.body.get(TYPE_SCOPE).body.get("{ b: { d: number }, c: number }")
        .type
    );
  });
  test("Typeof refinement for union property(function)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: number } | { b: () => number, c: number } = { b: 2 };
      if (typeof a.b === "function") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-37]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(
      actual.body.get(TYPE_SCOPE).body.get("{ b: () => number, c: number }")
        .type
    );
  });
  test("Multiple typeof refinement for union variable", async () => {
    const sourceAST = prepareAST(`
      const a: number | boolean | string = 2;
      if (typeof a === "number" || typeof a === "string") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-58]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(
      new UnionType("number | string", [new Type("number"), new Type("string")])
    );
  });
  // test("Multiple typeof refinement for property", async () => {
  //   const sourceAST = prepareAST(`
  //     const a: { a: string } | { a: number, b: string } | { a: number, b: number } = { a: 2, b: 2 };
  //     if (typeof a.a === "number" && typeof a.b === "number") {
  //       const b = a;
  //     }
  //   `);
  //   const [[actual], errors] = await createTypeGraph([sourceAST]);
  //   const actualScope = actual.body.get("[[Scope3-62]]");
  //   expect(errors.length).toBe(0);
  //   expect(actualScope.body.get("b").type).toEqual(
  //     actual.body.get(TYPE_SCOPE).body.get("{ a: number, b: number }").type
  //   );
  // });
  test("Typeof refinement for property in nested member expression", async () => {
    const sourceAST = prepareAST(`
      const a: { a: { b: number } } | { a: { b: string }, b: string } = { a: { b: 2 } };
      if (typeof a.a.b === "number") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-37]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(
      actual.body.get(TYPE_SCOPE).body.get("{ a: { b: number } }").type
    );
  });
  test("Useless typeof", async () => {
    const sourceAST = prepareAST(`
      const a: { a: number, b: string } | { a: number, b: number } = { a: 2, b: 2 };
      if (typeof a.a === "number") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(1);
    expect(errors[0].constructor).toBe(HegelError);
    expect(errors[0].message).toEqual(
      'Property can\'t be "number" type or always have type "number"'
    );
  });
  test("Typeof refinement for variable without variant", async () => {
    const sourceAST = prepareAST(`
      const a: number | boolean = 2;
      if (typeof a === "string") {
        const b = a;
      }
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(1);
    expect(errors[0].constructor).toBe(HegelError);
    expect(errors[0].message).toEqual(
      'Type boolean | number can\'t be "string" type'
    );
  });
  test("Instanceof refinement for union variable", async () => {
    const sourceAST = prepareAST(`
      const a: number | Array<number> = 2;
      if (a instanceof Array) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      await mixTypeDefinitions(createTypeGraph)
    );
    const actualScope = actual.body.get("[[Scope3-30]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toBeInstanceOf(CollectionType);
    expect(actualScope.body.get("b").type.name).toBe("Array<number>");
    expect(actualScope.body.get("b").type.keyType).toEqual(new Type("number"));
    expect(actualScope.body.get("b").type.valueType).toEqual(
      new Type("number")
    );
  });
  test("Instanceof refinement for union property", async () => {
    const sourceAST = prepareAST(`
      const a: { b: number } | { b: Array<number> } = { b: 2 };
      if (a.b instanceof Array) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      await mixTypeDefinitions(createTypeGraph)
    );
    const actualScope = actual.body.get("[[Scope3-32]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toBeInstanceOf(ObjectType);
    expect(actualScope.body.get("b").type.name).toBe("{ b: Array<number> }");
    expect(actualScope.body.get("b").type.properties.get("b").type.name).toBe(
      "Array<number>"
    );
    expect(
      actualScope.body.get("b").type.properties.get("b").type.keyType
    ).toEqual(new Type("number"));
    expect(
      actualScope.body.get("b").type.properties.get("b").type.valueType
    ).toEqual(new Type("number"));
  });
  test("In refinement for union variable", async () => {
    const sourceAST = prepareAST(`
      const a: { a: number } | { b: string } = { a: 2 };
      if ('a' in a) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-20]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(
      actual.body.get(TYPE_SCOPE).body.get("{ a: number }").type
    );
  });
  test("In refinement for union property", async () => {
    const sourceAST = prepareAST(`
      const a: { a: { b: string } | { c: string } } = { a: { b: '2' } };
      if ('b' in a.a) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-22]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(
      actual.body.get(TYPE_SCOPE).body.get("{ a: { b: string } }").type
    );
  });
  test("In refinement for property in union variable", async () => {
    const sourceAST = prepareAST(`
      const a: { a: { c: string } } | { a: { b: string } } = { a: { b: '2' } };
      if ('b' in a.a) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-22]]");
    expect(errors.length).toBe(0);
    expect(actualScope.body.get("b").type).toEqual(
      actual.body.get(TYPE_SCOPE).body.get("{ a: { b: string } }").type
    );
  });
});
describe("Other", () => {
  test("Should refinement paramtetric polymorphism", async () => {
    const sourceAST = prepareAST(`
      const id = x => x;
      const a = id(2);
      const b = id("str");
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type).toEqual(new Type("number"));
    expect(actual.body.get("b").type).toEqual(new Type("string"));
  });
});
