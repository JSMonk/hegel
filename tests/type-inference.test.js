const prepareAST = require("./preparation");
const createTypeGraph = require("../build/type/type-graph").default;
const {
  Type,
  TypeVar,
  UnionType,
  TupleType,
  ObjectType,
  GenericType,
  FunctionType,
  VariableInfo,
  CollectionType,
  TYPE_SCOPE
} = require("../build/type/types");

describe("Simple inference for module variables by literal", () => {
  test("Inference global module variable with number type", () => {
    const sourceAST = prepareAST(`
      const a = 2;
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("number"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with boolean type", () => {
    const sourceAST = prepareAST(`
      const a = true;
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("boolean"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with string type", () => {
    const sourceAST = prepareAST(`
      const a = "test";
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("string"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with null type", () => {
    const sourceAST = prepareAST(`
      const a = null;
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type(null, { isLiteralOf: new Type("void") }),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with null type", () => {
    const sourceAST = prepareAST(`
      const a = undefined;
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("undefined", { isLiteralOf: new Type("void") }),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with object type", () => {
    const sourceAST = prepareAST(`
      const a = {};
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new ObjectType("{  }", []),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with empty array type", () => {
    const sourceAST = prepareAST(`
      const a = [];
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new TupleType("[]", []),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with single item array type", () => {
    const sourceAST = prepareAST(`
      const a = [2];
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new TupleType("[number]", [new Type("number")]),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with multy items array type", () => {
    const sourceAST = prepareAST(`
      const a = [2, "2"];
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new TupleType("[number, string]", [
        new Type("number"),
        new Type("string")
      ]),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
});
describe("Simple inference for module variables by function return", () => {
  test("Inference global module variable with number type", () => {
    const sourceAST = prepareAST(`
      function getA(): number {
        return 2;
      }
      const a = getA();
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("number"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with boolean type", () => {
    const sourceAST = prepareAST(`
      function getA(): boolean {
        return false;
      }
      const a = getA();
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("boolean"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with string type", () => {
    const sourceAST = prepareAST(`
      function getA(): string {
        return "test";
      }
      const a = getA();
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("string"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with null type", () => {
    const sourceAST = prepareAST(`
      function getA(): null {
        return null;
      }
      const a = getA();
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type(null, { isLiteralOf: new Type("void") }),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with undefined type", () => {
    const sourceAST = prepareAST(`
      function getA(): undefined {}
      const a = getA();
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("undefined", { isLiteralOf: new Type("void") }),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with void type", () => {
    const sourceAST = prepareAST(`
      function getA(): void {
      }
      const a = getA();
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("void"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with mixed type", () => {
    const sourceAST = prepareAST(`
      function getA(): mixed {
      }
      const a = getA();
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("mixed"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with union type", () => {
    const sourceAST = prepareAST(`
      function getA(): string | number {
        return 2;
      }
      const a = getA();
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new UnionType("number | string", [
        new Type("number"),
        new Type("string")
      ]),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with tuple type", () => {
    const sourceAST = prepareAST(`
      function getA(): [string, number] {
        return 2;
      }
      const a = getA();
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new TupleType("[string, number]", [
        new Type("string"),
        new Type("number")
      ]),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with nullable type", () => {
    const sourceAST = prepareAST(`
      function getA(): ?number {
        return 2;
      }
      const a = getA();
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new UnionType("number | void", [
        new Type("number"),
        new Type("void")
      ]),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with object type", () => {
    const sourceAST = prepareAST(`
      function getA(): { a: number } {
        return { a: 2 };
      }
      const a = getA();
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new ObjectType("{ a: number }", [
        ["a", new VariableInfo(new Type("number"), actual)]
      ]),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with alias type", () => {
    const sourceAST = prepareAST(`
      type A = { a: number }
      function getA(): A {
        return { a: 2 };
      }
      const a = getA();
    `);
    const [actual] = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new ObjectType("{ a: number }", [
        ["a", new VariableInfo(new Type("number"), actual)]
      ]),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Inference global module variable with generic alias type", () => {
    const sourceAST = prepareAST(`
      type A<T> = { a: T }
      function getA(): A<number> {
        return { a: 2 };
      }
      const a = getA();
    `);
    const [actual] = createTypeGraph(sourceAST);
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
  test("Inference global module function arguments", () => {
    const sourceAST = prepareAST(`
      function a(b): void {
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => void");
    expect(actualA.type.subordinateType.returnType).toEqual(new Type("void"));
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α")
    ]);
  });
  test("Inference global module function without return type", () => {
    const sourceAST = prepareAST(`
      function a() {
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => void");
    expect(actualA.type.returnType).toEqual(new Type("void"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function by single return type", () => {
    const sourceAST = prepareAST(`
      function a() {
      	return 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function return type by free variable return", () => {
    const sourceAST = prepareAST(`
			const x: string = "test";
      function a() {
      	return x;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => string");
    expect(actualA.type.returnType).toEqual(new Type("string"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function type", () => {
    const sourceAST = prepareAST(`
      function a(x) {
      	return x;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => α");
    expect(actualA.type.subordinateType.returnType).toEqual(new TypeVar("α"));
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α")
    ]);
  });
  test("Inference global module function type by arguments usage", () => {
    const sourceAST = prepareAST(`
      function a(x) {
      	return x - 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments usage", () => {
    const sourceAST = prepareAST(`
      function a(x) {
				return () => x - 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => () => number");
    expect(actualA.type.returnType).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link", () => {
    const sourceAST = prepareAST(`
      function a(x) {
        const b = x;
        return b - 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link inside inner function", () => {
    const sourceAST = prepareAST(`
      function a(x) {
        const f = () => {
          const b = x;
          return b - 2;
        };
        return f();
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link inside deep nested function", () => {
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
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => string");
    expect(actualA.type.returnType).toEqual(new Type("string"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference function local variable type", () => {
    const sourceAST = prepareAST(`
      function a(x) {
        const b = 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAScope = actual.body.get("[[Scope2-6]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
  });
  test("Inference function local variable type by argument link", () => {
    const sourceAST = prepareAST(`
      function a(x) {
        const b = x;
        return x - 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAScope = actual.body.get("[[Scope2-6]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
  });
  test("Inference function local variable type by nested function usage", () => {
    const sourceAST = prepareAST(`
      function a(x) {
        const b = x;
        const fn = () => {
          const c = b;
          return c - 2;
        }
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAScope = actual.body.get("[[Scope2-6]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
    expect(actualAScope.body.get("x").type).toEqual(new Type("number"));
    expect(actualAScope.body.get("fn").type).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
  });
  test("Inference global module function arguments inside function expression", () => {
    const sourceAST = prepareAST(`
      const a = function(b): void {
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => void");
    expect(actualA.type.subordinateType.returnType).toEqual(new Type("void"));
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α")
    ]);
  });
  test("Inference global module function without return type inside function expression", () => {
    const sourceAST = prepareAST(`
      const a = function () {
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => void");
    expect(actualA.type.returnType).toEqual(new Type("void"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function by single return type inside function expression", () => {
    const sourceAST = prepareAST(`
      const a = function () {
      	return 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function return type by free variable return inside function expression", () => {
    const sourceAST = prepareAST(`
			const x: string = "test";
      const a = function () {
      	return x;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => string");
    expect(actualA.type.returnType).toEqual(new Type("string"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function type inside function expression", () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
      	return x;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => α");
    expect(actualA.type.subordinateType.returnType).toEqual(new TypeVar("α"));
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α")
    ]);
  });
  test("Inference global module function type by arguments usage inside function expression", () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
      	return x - 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments usage inside function expression", () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
				return () => x - 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => () => number");
    expect(actualA.type.returnType).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link inside function expression", () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
        const b = x;
        return b - 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link inside inner function inside function expression", () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
        const f = () => {
          const b = x;
          return b - 2;
        };
        return f();
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link inside deep nested function inside function expression", () => {
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
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => string");
    expect(actualA.type.returnType).toEqual(new Type("string"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference function local variable type inside function expression", () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
        const b = 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAScope = actual.body.get("[[Scope2-16]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
  });
  test("Inference function local variable type by argument link inside function expression", () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
        const b = x;
        return x - 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAScope = actual.body.get("[[Scope2-16]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
  });
  test("Inference function local variable type by nested function usage inside function expression", () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
        const b = x;
        const fn = () => {
          const c = b;
          return c - 2;
        }
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAScope = actual.body.get("[[Scope2-16]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
    expect(actualAScope.body.get("x").type).toEqual(new Type("number"));
    expect(actualAScope.body.get("fn").type).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
  });
  test("Inference global module function arguments inside arrow function", () => {
    const sourceAST = prepareAST(`
      const a = (b): void => {
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => void");
    expect(actualA.type.subordinateType.returnType).toEqual(new Type("void"));
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α")
    ]);
  });
  test("Inference global module function without return type inside arrow function", () => {
    const sourceAST = prepareAST(`
      const a = () => {
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => void");
    expect(actualA.type.returnType).toEqual(new Type("void"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function by single return 1 type inside arrow function", () => {
    const sourceAST = prepareAST(`
      const a =  () => {
      	return 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function by single return 2 type inside arrow function", () => {
    const sourceAST = prepareAST(`
      const a =  () => 2
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function return type by free variable return 1 inside arrow function", () => {
    const sourceAST = prepareAST(`
			const x: string = "test";
      const a = () => {
      	return x;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => string");
    expect(actualA.type.returnType).toEqual(new Type("string"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function return type by free variable return 2 inside arrow function", () => {
    const sourceAST = prepareAST(`
			const x: string = "test";
      const a = () => x;
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("() => string");
    expect(actualA.type.returnType).toEqual(new Type("string"));
    expect(actualA.type.argumentsTypes).toEqual([]);
  });
  test("Inference global module function type 1 inside arrow function", () => {
    const sourceAST = prepareAST(`
      const a = x => {
      	return x;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => α");
    expect(actualA.type.subordinateType.returnType).toEqual(new TypeVar("α"));
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α")
    ]);
  });
  test("Inference global module function type 2 inside arrow function", () => {
    const sourceAST = prepareAST(`
      const a = x => x;
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(GenericType);
    expect(actualA.type.name).toEqual("<α>(α) => α");
    expect(actualA.type.subordinateType.returnType).toEqual(new TypeVar("α"));
    expect(actualA.type.subordinateType.argumentsTypes).toEqual([
      new TypeVar("α")
    ]);
  });
  test("Inference global module function type by arguments usage 1 inside arrow function", () => {
    const sourceAST = prepareAST(`
      const a = x => {
        return x - 2
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by arguments usage 2 inside arrow function", () => {
    const sourceAST = prepareAST(`
      const a = x => x - 2
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments usage 1 inside arrow function", () => {
    const sourceAST = prepareAST(`
      const a = (x) => {
				return () => x - 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => () => number");
    expect(actualA.type.returnType).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments usage 2 inside arrow function", () => {
    const sourceAST = prepareAST(`
      const a = x => () => x - 2;
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => () => number");
    expect(actualA.type.returnType).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link inside arrow function", () => {
    const sourceAST = prepareAST(`
      const a = x => {
        const b = x;
        return b - 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link inside inner function inside arrow function", () => {
    const sourceAST = prepareAST(`
      const a = x => {
        const f = () => {
          const b = x;
          return b - 2;
        };
        return f();
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => number");
    expect(actualA.type.returnType).toEqual(new Type("number"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference global module function type by inner function arguments link inside deep nested function inside arrow function", () => {
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
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a");
    expect(actualA.type.constructor).toBe(FunctionType);
    expect(actualA.type.name).toEqual("(number) => string");
    expect(actualA.type.returnType).toEqual(new Type("string"));
    expect(actualA.type.argumentsTypes).toEqual([new Type("number")]);
  });
  test("Inference function local variable type inside arrow function", () => {
    const sourceAST = prepareAST(`
      const a = x => {
        const b = 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAScope = actual.body.get("[[Scope2-16]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
  });
  test("Inference function local variable type by argument link inside arrow function", () => {
    const sourceAST = prepareAST(`
      const a = x => {
        const b = x;
        return x - 2;
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAScope = actual.body.get("[[Scope2-16]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
  });
  test("Inference function local variable type by nested function usage inside arrow function", () => {
    const sourceAST = prepareAST(`
      const a = x => {
        const b = x;
        const fn = () => {
          const c = b;
          return c - 2;
        }
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualAScope = actual.body.get("[[Scope2-16]]");
    expect(actualAScope.body.get("b").type).toEqual(new Type("number"));
    expect(actualAScope.body.get("x").type).toEqual(new Type("number"));
    expect(actualAScope.body.get("fn").type).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
  });
});
describe("Object type inference", () => {
  test("Inference object type with all simple types", () => {
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
    const [actual] = createTypeGraph(sourceAST);
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
    expect(actualA.properties.get("6").type).toEqual(new ObjectType("RegExp"));
    expect(actualA.name).toEqual(
      "{ 1: number, 2: string, 3: boolean, 4: null, 5: undefined, 6: RegExp }"
    );
  });
  test("Inference object type with all function types", () => {
    const sourceAST = prepareAST(`
      const a = {
        a() { return 2 },
        b: function(a) {},
        c: x => x
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
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
  test("Inference object type with nested object", () => {
    const sourceAST = prepareAST(`
      const a = {
        b: { c: () => 2 }
      }
    `);
    const [actual] = createTypeGraph(sourceAST);
    const actualA = actual.body.get("a").type;
    expect(actualA.properties.get("b").type.properties.get("c").type).toEqual(
      new FunctionType("() => number", [], new Type("number"))
    );
    expect(actualA.name).toEqual("{ b: { c: () => number } }");
  });
});
