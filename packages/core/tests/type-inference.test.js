const HegelError = require("../build/utils/errors").default;
const createTypeGraph = require("../build/type-graph/type-graph").default;
const { Type } = require("../build/type-graph/types/type");
const { TypeVar } = require("../build/type-graph/types/type-var");
const { TupleType } = require("../build/type-graph/types/tuple-type");
const { UnionType } = require("../build/type-graph/types/union-type");
const { ObjectType } = require("../build/type-graph/types/object-type");
const { GenericType } = require("../build/type-graph/types/generic-type");
const { FunctionType } = require("../build/type-graph/types/function-type");
const { CollectionType } = require("../build/type-graph/types/collection-type");
const {
  prepareAST,
  getModuleAST,
  mixTypeDefinitions
} = require("./preparation");

describe("Simple inference for module variables by literal", () => {
  test("Inference global module constant with number type", async () => {
    const sourceAST = prepareAST(`
      const a = 2;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type === Type.find(2)).toBe(true);
  });
  test("Inference global module constant variable with number type", async () => {
    const sourceAST = prepareAST(`
      let a = 2;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type === Type.Number).toBe(true);
  });
  test("Inference global module constant with boolean type", async () => {
    const sourceAST = prepareAST(`
      const a = true;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type === Type.find(true)).toBe(true);
  });
  test("Inference global module variable with boolean type", async () => {
    const sourceAST = prepareAST(`
      let a = true;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type === Type.Boolean).toBe(true);
  });
  test("Inference global module constant with string type", async () => {
    const sourceAST = prepareAST(`
      const a = "test";
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type === Type.find("'test'")).toBe(true);
  });
  test("Inference global module variable with string type", async () => {
    const sourceAST = prepareAST(`
      let a = "test";
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type === Type.String).toBe(true);
  });
  test("Inference global module constant with null type", async () => {
    const sourceAST = prepareAST(`
      const a = null;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type === Type.Null).toBe(true);
  });
  test("Inference global module variable with null type", async () => {
    const sourceAST = prepareAST(`
      let a = null;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type === Type.Null).toBe(true);
  });
  test("Inference global module constant with undefined type", async () => {
    const sourceAST = prepareAST(`
      const a = undefined;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type === Type.Undefined).toBe(true);
  });
  test("Inference global module variable with undefined type", async () => {
    const sourceAST = prepareAST(`
      let a = undefined;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type === Type.Undefined).toBe(true);
  });
  test("Inference global module constant with object type", async () => {
    const sourceAST = prepareAST(`
      const a = {};
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type === Type.find("{  }")).toBe(true);
  });
  test("Inference global module variable with object type", async () => {
    const sourceAST = prepareAST(`
      let a = {};
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type === Type.find("{  }")).toBe(true);
  });
  test("Inference global module constant with empty array type", async () => {
    const sourceAST = prepareAST(`
      const a = [];
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const a = actual.body.get("a").type;
    expect(errors.length).toBe(0);
    expect(a).toBeInstanceOf(TupleType);
    expect(a === Type.find("[]")).toBe(true);
    expect(a.items.length).toBe(0);
  });
  test("Inference global module variable with empty array type", async () => {
    const sourceAST = prepareAST(`
      let a = [];
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const a = actual.body.get("a").type;
    expect(errors.length).toBe(0);
    expect(a).toBeInstanceOf(CollectionType);
    expect(a === Type.find("Array<unknown>")).toBe(true);
  });
  test("Inference global module constant with single item array type", async () => {
    const sourceAST = prepareAST(`
      const a = [2];
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const a = actual.body.get("a").type;
    expect(errors.length).toBe(0);
    expect(a).toBeInstanceOf(TupleType);
    expect(a === Type.find("[2]")).toBe(true);
    expect(a.items.length).toBe(1);
    expect(a.items[0] === Type.find(2)).toBe(true);
  });
  test("Inference global module variable with single item array type", async () => {
    const sourceAST = prepareAST(`
      let a = [2];
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const a = actual.body.get("a").type;
    expect(errors.length).toBe(0);
    expect(a).toBeInstanceOf(CollectionType);
    expect(a === Type.find("Array<number>")).toBe(true);
  });
  test("Inference global module constant with multy items array type", async () => {
    const sourceAST = prepareAST(`
      const a = [2, "2"];
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const a = actual.body.get("a").type;
    expect(errors.length).toBe(0);
    expect(a).toBeInstanceOf(TupleType);
    expect(a === Type.find("[2, '2']")).toBe(true);
    expect(a.items.length).toBe(2);
    expect(a.items[0] === Type.find(2)).toBe(true);
    expect(a.items[1] === Type.find("'2'")).toBe(true);
  });
  test("Inference global module variable with multy items array type", async () => {
    const sourceAST = prepareAST(`
      let a = [2, "2"];
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const a = actual.body.get("a").type;
    expect(errors.length).toBe(0);
    expect(a).toBeInstanceOf(CollectionType);
    expect(a === Type.find("Array<number | string>")).toBe(true);
  });
  test("Inference global module object property type", async () => {
    const sourceAST = prepareAST(`
      const a = { a: 1 };
      const b = a.a;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a").type;
    const b = actual.body.get("b").type;
    expect(errors.length).toBe(0);
    expect(a).toBeInstanceOf(ObjectType);
    expect(a === Type.find("{ a: number }")).toBe(true);
    expect(a.properties.get("a").type === Type.Number).toBe(true);
    expect(b === Type.Number).toBe(true);
  });
});
describe("Simple inference for module variables by function return", () => {
  test("Inference global module variable with empty return", async () => {
    const sourceAST = prepareAST(`
      function a() {
        return;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("() => undefined")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType === Type.Undefined).toBe(true);
  });
  test("Inference global module variable with number type", async () => {
    const sourceAST = prepareAST(`
      function getA(): number {
        return 2;
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const getA = actual.body.get("getA");
    expect(errors.length).toBe(0);
    expect(getA.type).toBeInstanceOf(FunctionType);
    expect(getA.type === Type.find("() => number")).toBe(true);
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType === Type.Number).toBe(true);
    expect(a.type === getA.type.returnType).toBe(true);
  });
  test("Inference global module variable with boolean type", async () => {
    const sourceAST = prepareAST(`
      function getA(): boolean {
        return false;
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const getA = actual.body.get("getA");
    expect(errors.length).toBe(0);
    expect(getA.type).toBeInstanceOf(FunctionType);
    expect(getA.type === Type.find("() => boolean")).toBe(true);
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType === Type.Boolean).toBe(true);
    expect(a.type === getA.type.returnType).toBe(true);
  });
  test("Inference global module variable with string type", async () => {
    const sourceAST = prepareAST(`
      function getA(): string {
        return "test";
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const getA = actual.body.get("getA");
    expect(errors.length).toBe(0);
    expect(getA.type).toBeInstanceOf(FunctionType);
    expect(getA.type === Type.find("() => string")).toBe(true);
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType === Type.String).toBe(true);
    expect(a.type === getA.type.returnType).toBe(true);
  });
  test("Inference global module variable with null type", async () => {
    const sourceAST = prepareAST(`
      function getA(): null {
        return null;
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const getA = actual.body.get("getA");
    expect(errors.length).toBe(0);
    expect(getA.type).toBeInstanceOf(FunctionType);
    expect(getA.type === Type.find("() => null")).toBe(true);
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType === Type.Null).toBe(true);
    expect(a.type === getA.type.returnType).toBe(true);
  });
  test("Inference global module variable with undefined type", async () => {
    const sourceAST = prepareAST(`
      function getA(): undefined {}
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const getA = actual.body.get("getA");
    expect(errors.length).toBe(0);
    expect(getA.type).toBeInstanceOf(FunctionType);
    expect(getA.type === Type.find("() => undefined")).toBe(true);
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType === Type.Undefined).toBe(true);
    expect(a.type === getA.type.returnType).toBe(true);
  });
  test("Inference global module variable with void type", async () => {
    const sourceAST = prepareAST(`
      function getA() {
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const getA = actual.body.get("getA");
    expect(errors.length).toBe(0);
    expect(getA.type).toBeInstanceOf(FunctionType);
    expect(getA.type === Type.find("() => undefined")).toBe(true);
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType === Type.Undefined).toBe(true);
    expect(a.type === getA.type.returnType).toBe(true);
  });
  test("Inference global module variable with unknown type", async () => {
    const sourceAST = prepareAST(`
      function getA(): unknown {
        return 2;
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const getA = actual.body.get("getA");
    expect(errors.length).toBe(0);
    expect(getA.type).toBeInstanceOf(FunctionType);
    expect(getA.type === Type.find("() => unknown")).toBe(true);
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType === Type.Unknown).toBe(true);
    expect(a.type === getA.type.returnType).toBe(true);
  });
  test("Inference global module variable with union type", async () => {
    const sourceAST = prepareAST(`
      function getA(): string | number {
        return 2;
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const getA = actual.body.get("getA");
    expect(errors.length).toBe(0);
    expect(getA.type).toBeInstanceOf(FunctionType);
    expect(getA.type === Type.find("() => number | string")).toBe(true);
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBeInstanceOf(UnionType);
    expect(getA.type.returnType.variants.length).toBe(2);
    expect(getA.type.returnType.variants[0] === Type.Number).toBe(true);
    expect(getA.type.returnType.variants[1] === Type.String).toBe(true);
    expect(getA.type.returnType === Type.find("number | string")).toBe(true);
    expect(a.type === getA.type.returnType).toBe(true);
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
      mixTypeDefinitions()
    );
    const a = actual.body.get("a");
    const getA = actual.body.get("getA");
    expect(errors.length).toBe(0);
    expect(getA.type).toBeInstanceOf(FunctionType);
    expect(getA.type === Type.find("() => [string, number]")).toBe(true);
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBeInstanceOf(TupleType);
    expect(getA.type.returnType.items.length).toBe(2);
    expect(getA.type.returnType.items[0] === Type.String).toBe(true);
    expect(getA.type.returnType.items[1] === Type.Number).toBe(true);
    expect(getA.type.returnType === Type.find("[string, number]")).toBe(true);
    expect(a.type === getA.type.returnType).toBe(true);
  });
  test("Inference global module variable with nullable type", async () => {
    const sourceAST = prepareAST(`
      function getA(): ?number {
        return 2;
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const getA = actual.body.get("getA");
    expect(errors.length).toBe(0);
    expect(getA.type).toBeInstanceOf(FunctionType);
    expect(getA.type === Type.find("() => number | undefined")).toBe(true);
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBeInstanceOf(UnionType);
    expect(getA.type.returnType.variants.length).toBe(2);
    expect(getA.type.returnType.variants[0] === Type.Number).toBe(true);
    expect(getA.type.returnType.variants[1] === Type.Undefined).toBe(true);
    expect(getA.type.returnType === Type.find("number | undefined")).toBe(true);
    expect(a.type === getA.type.returnType).toBe(true);
  });
  test("Inference global module variable with object type", async () => {
    const sourceAST = prepareAST(`
      function getA(): { a: number } {
        return { a: 2 };
      }
      const a = getA();
    `);
    const [[actual], errors, globalModule] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const a = actual.body.get("a");
    const getA = actual.body.get("getA");
    expect(errors.length).toBe(0);
    expect(getA.type).toBeInstanceOf(FunctionType);
    expect(getA.type === Type.find("() => { a: number }")).toBe(true);
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBeInstanceOf(ObjectType);
    expect(getA.type.returnType.properties.size).toBe(1);
    expect(getA.type.returnType.properties.get("a").type === Type.Number).toBe(
      true
    );
    expect(getA.type.returnType === Type.find("{ a: number }")).toBe(true);
    expect(a.type === getA.type.returnType).toBe(true);
  });
  test("Inference global module variable with alias type", async () => {
    const sourceAST = prepareAST(`
      type A = { a: number }
      function getA(): A {
        return { a: 2 };
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const a = actual.body.get("a");
    const getA = actual.body.get("getA");
    expect(errors.length).toBe(0);
    expect(getA.type).toBeInstanceOf(FunctionType);
    expect(getA.type === Type.find("() => { a: number }")).toBe(true);
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBeInstanceOf(ObjectType);
    expect(getA.type.returnType.properties.size).toBe(1);
    expect(getA.type.returnType.properties.get("a").type === Type.Number).toBe(
      true
    );
    expect(getA.type.returnType === Type.find("{ a: number }")).toBe(true);
    expect(a.type === getA.type.returnType).toBe(true);
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
    const a = actual.body.get("a");
    const getA = actual.body.get("getA");
    expect(errors.length).toBe(0);
    expect(getA.type).toBeInstanceOf(FunctionType);
    expect(getA.type === Type.find("() => A<number>")).toBe(true);
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBeInstanceOf(ObjectType);
    expect(getA.type.returnType.properties.size).toBe(1);
    expect(getA.type.returnType.properties.get("a").type === Type.Number).toBe(
      true
    );
    expect(getA.type.returnType === Type.find("A<number>")).toBe(true);
    expect(a.type === getA.type.returnType).toBe(true);
  });
});
describe("Simple inference for module functions", () => {
  test("Inference global module function arguments", async () => {
    const sourceAST = prepareAST(`
      function a(b): undefined {
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(GenericType);
    expect(a.type.subordinateType.argumentsTypes.length).toBe(1);
    expect(a.type.subordinateType.argumentsTypes[0]).toBeInstanceOf(TypeVar);
    expect(a.type.subordinateType.returnType === Type.Undefined).toBe(true);
  });
  test("Inference global module function without return type", async () => {
    const sourceAST = prepareAST(`
      function a() {
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("() => undefined")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType === Type.Undefined).toBe(true);
  });
  test("Inference global module function by single return type", async () => {
    const sourceAST = prepareAST(`
      function a() {
      	return 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("() => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType === Type.Number).toBe(true);
  });
  test("Inference global module function return type by free variable return", async () => {
    const sourceAST = prepareAST(`
  		const x: string = "test";
      function a() {
      	return x;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const x = actual.body.get("x");
    expect(errors.length).toBe(0);
    expect(x.type === Type.String).toBe(true);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("() => string")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType).toBe(x.type);
  });
  test("Inference global module function type", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
      	return x;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(GenericType);
    expect(a.type.subordinateType.argumentsTypes.length).toBe(1);
    expect(a.type.subordinateType.argumentsTypes[0]).toBeInstanceOf(TypeVar);
    expect(
      a.type.subordinateType.returnType ===
        a.type.subordinateType.argumentsTypes[0]
    ).toBe(true);
  });
  test("Inference global module function type by arguments usage", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
      	return x - 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.Number).toBe(true);
  });
  test("Inference global module function type by inner function arguments usage", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
        return () => x - 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => () => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType).toBeInstanceOf(FunctionType);
    expect(a.type.returnType === Type.find("() => number")).toBe(true);
    expect(a.type.returnType.argumentsTypes.length).toBe(0);
    expect(a.type.returnType.returnType === Type.Number).toBe(true);
  });
  test("Inference global module function type by arguments usage", async () => {
    const sourceAST = prepareAST(`
      function mul(a, b) {
        return a * b;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const mul = actual.body.get("mul");
    expect(errors.length).toBe(0);
    expect(mul.type).toBeInstanceOf(GenericType);
    expect(mul.type.subordinateType.argumentsTypes.length).toBe(2);
    expect(mul.type.subordinateType.argumentsTypes[0]).toBeInstanceOf(TypeVar);
    expect(
      mul.type.subordinateType.argumentsTypes[0].constraint
    ).toBeInstanceOf(UnionType);
    expect(
      mul.type.subordinateType.argumentsTypes[0].constraint ===
        Type.find("bigint | number")
    ).toBe(true);
    expect(
      mul.type.subordinateType.argumentsTypes[0].constraint.variants.length
    ).toBe(2);
    expect(
      mul.type.subordinateType.argumentsTypes[0].constraint.variants[0] ===
        Type.BigInt
    ).toBe(true);
    expect(
      mul.type.subordinateType.argumentsTypes[0].constraint.variants[1] ===
        Type.Number
    ).toBe(true);
    expect(mul.type.subordinateType.argumentsTypes[1]).toBeInstanceOf(TypeVar);
    expect(
      mul.type.subordinateType.argumentsTypes[1].constraint
    ).toBeInstanceOf(UnionType);
    expect(
      mul.type.subordinateType.argumentsTypes[1].constraint ===
        Type.find("bigint | number")
    ).toBe(true);
    expect(
      mul.type.subordinateType.argumentsTypes[1].constraint.variants.length
    ).toBe(2);
    expect(
      mul.type.subordinateType.argumentsTypes[1].constraint.variants[0] ===
        Type.BigInt
    ).toBe(true);
    expect(
      mul.type.subordinateType.argumentsTypes[1].constraint.variants[1] ===
        Type.Number
    ).toBe(true);
    expect(mul.type.subordinateType.returnType).toBeInstanceOf(TypeVar);
    expect(mul.type.subordinateType.returnType.constraint).toBeInstanceOf(
      UnionType
    );
    expect(
      mul.type.subordinateType.returnType.constraint ===
        Type.find("bigint | number")
    ).toBe(true);
    expect(mul.type.subordinateType.returnType.constraint.variants.length).toBe(
      2
    );
    expect(
      mul.type.subordinateType.returnType.constraint.variants[0] === Type.BigInt
    ).toBe(true);
    expect(
      mul.type.subordinateType.returnType.constraint.variants[1] === Type.Number
    ).toBe(true);
  });
  test("Inference global module function type by multiple arguments usage", async () => {
    const sourceAST = prepareAST(`
      const rol = (x, i) => (x << i) | (x >>> (32 - i));
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const rol = actual.body.get("rol");
    expect(errors.length).toBe(0);
    expect(rol.type).toBeInstanceOf(FunctionType);
    expect(rol.type === Type.find("(number, number) => number")).toBe(true);
    expect(rol.type.argumentsTypes.length).toBe(2);
    expect(rol.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(rol.type.argumentsTypes[1] === Type.Number).toBe(true);
    expect(rol.type.returnType === Type.Number).toBe(true);
  });
  test("Inference global module function type by inner function arguments link", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
        const b = x;
        return b - 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const aScope = actual.scopes.get("[[Scope2-6]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.Number).toBe(true);
    expect(aScope.body.get("b").type === Type.Number).toBe(true);
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
    const a = actual.body.get("a");
    const aScope = actual.scopes.get("[[Scope2-6]]");
    const fScope = actual.scopes.get("[[Scope3-18]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.Number).toBe(true);
    expect(aScope.body.get("f").type === Type.find("() => number")).toBe(true);
    expect(fScope.body.get("b").type === Type.Number).toBe(true);
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
    const a = actual.body.get("a");
    const aScope = actual.scopes.get("[[Scope2-6]]");
    const fScope = actual.scopes.get("[[Scope3-18]]");
    const f1Scope = actual.scopes.get("[[Scope4-21]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => string")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.String).toBe(true);
    expect(aScope.body.get("f").type === Type.find("() => string")).toBe(true);
    expect(fScope.body.get("f1").type === Type.find("() => undefined")).toBe(
      true
    );
    expect(f1Scope.body.get("f2").type === Type.find("() => number")).toBe(
      true
    );
  });
  test("Inference function local variable type", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
        const b = 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const aScope = actual.scopes.get("[[Scope2-6]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(GenericType);
    expect(a.type.subordinateType.argumentsTypes.length).toBe(1);
    expect(a.type.subordinateType.returnType === Type.Undefined).toBe(true);
    expect(aScope.body.get("b").type === Type.find(2)).toBe(true);
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
    const a = actual.body.get("a");
    const aScope = actual.scopes.get("[[Scope2-6]]");
    const fnScope = actual.scopes.get("[[Scope4-19]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => undefined")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.Undefined).toBe(true);
    expect(aScope.body.get("fn").type).toBeInstanceOf(FunctionType);
    expect(aScope.body.get("fn").type === Type.find("() => number")).toBe(true);
    expect(aScope.body.get("fn").type.argumentsTypes.length).toBe(0);
    expect(aScope.body.get("fn").type.returnType === Type.Number).toBe(true);
    expect(fnScope.body.get("c").type === Type.Number).toBe(true);
  });
  test("Inference global module function arguments inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function(b): undefined {
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(GenericType);
    expect(a.type.subordinateType.argumentsTypes.length).toBe(1);
    expect(a.type.subordinateType.argumentsTypes[0]).toBeInstanceOf(TypeVar);
    expect(a.type.subordinateType.returnType === Type.Undefined).toBe(true);
  });
  test("Inference global module function without return type inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function () {
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("() => undefined")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType === Type.Undefined).toBe(true);
  });
  test("Inference global module function by single return type inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function () {
      	return 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("() => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType === Type.Number).toBe(true);
  });
  test("Inference global module function return type by free variable return inside function expression", async () => {
    const sourceAST = prepareAST(`
  		const x: string = "test";
      const a = function () {
      	return x;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const x = actual.body.get("x");
    expect(errors.length).toBe(0);
    expect(x.type === Type.String).toBe(true);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType).toBe(x.type);
  });
  test("Inference global module function type inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
      	return x;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(GenericType);
    expect(a.type.subordinateType.argumentsTypes.length).toBe(1);
    expect(a.type.subordinateType.argumentsTypes[0]).toBeInstanceOf(TypeVar);
    expect(
      a.type.subordinateType.returnType ===
        a.type.subordinateType.argumentsTypes[0]
    ).toBe(true);
  });
  test("Inference global module function type by arguments usage inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
      	return x - 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.Number).toBe(true);
  });
  test("Inference global module function type by inner function arguments usage inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
  			return () => x - 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => () => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType).toBeInstanceOf(FunctionType);
    expect(a.type.returnType === Type.find("() => number")).toBe(true);
    expect(a.type.returnType.argumentsTypes.length).toBe(0);
    expect(a.type.returnType.returnType === Type.Number).toBe(true);
  });
  test("Inference global module function type by inner function arguments link inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
        const b = x;
        return b - 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const aScope = actual.scopes.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.Number).toBe(true);
    expect(aScope.body.get("b").type === Type.Number).toBe(true);
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
    const a = actual.body.get("a");
    const aScope = actual.scopes.get("[[Scope2-16]]");
    const fScope = actual.scopes.get("[[Scope3-18]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.Number).toBe(true);
    expect(aScope.body.get("f").type === Type.find("() => number")).toBe(true);
    expect(fScope.body.get("b").type === Type.Number).toBe(true);
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
    const a = actual.body.get("a");
    const aScope = actual.scopes.get("[[Scope2-16]]");
    const fScope = actual.scopes.get("[[Scope3-18]]");
    const f1Scope = actual.scopes.get("[[Scope4-21]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => string")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.String).toBe(true);
    expect(aScope.body.get("f").type === Type.find("() => string")).toBe(true);
    expect(fScope.body.get("f1").type === Type.find("() => undefined")).toBe(
      true
    );
    expect(f1Scope.body.get("f2").type === Type.find("() => number")).toBe(
      true
    );
  });
  test("Inference function local variable type inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
        const b = 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const aScope = actual.scopes.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(GenericType);
    expect(a.type.subordinateType.argumentsTypes.length).toBe(1);
    expect(a.type.subordinateType.returnType === Type.Undefined).toBe(true);
    expect(aScope.body.get("b").type === Type.find(2)).toBe(true);
  });
  test("Inference function local variable type by argument link inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
        const b = x;
        return x - 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const aScope = actual.scopes.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.Number).toBe(true);
    expect(aScope.body.get("b").type === Type.Number).toBe(true);
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
    const a = actual.body.get("a");
    const aScope = actual.scopes.get("[[Scope2-16]]");
    const fnScope = actual.scopes.get("[[Scope4-19]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => undefined")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.Undefined).toBe(true);
    expect(aScope.body.get("fn").type).toBeInstanceOf(FunctionType);
    expect(aScope.body.get("fn").type === Type.find("() => number")).toBe(true);
    expect(aScope.body.get("fn").type.argumentsTypes.length).toBe(0);
    expect(aScope.body.get("fn").type.returnType === Type.Number).toBe(true);
    expect(fnScope.body.get("c").type === Type.Number).toBe(true);
  });
  test("Inference global module function arguments inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = (b): undefined => {
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(GenericType);
    expect(a.type.subordinateType.argumentsTypes.length).toBe(1);
    expect(a.type.subordinateType.argumentsTypes[0]).toBeInstanceOf(TypeVar);
    expect(a.type.subordinateType.returnType === Type.Undefined).toBe(true);
  });
  test("Inference global module function without return type inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = () => {
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("() => undefined")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType === Type.Undefined).toBe(true);
  });
  test("Inference global module function by single return 1 type inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = () => {
      	return 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("() => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType === Type.Number).toBe(true);
  });
  test("Inference global module function by single return 2 type inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = () => 2
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("() => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType === Type.Number).toBe(true);
  });
  test("Inference global module function return type by free variable return 1 inside arrow function", async () => {
    const sourceAST = prepareAST(`
  		const x: string = "test";
      const a = () => {
      	return x;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const x = actual.body.get("x");
    expect(errors.length).toBe(0);
    expect(x.type === Type.String).toBe(true);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType).toBe(x.type);
  });
  test("Inference global module function return type by free variable return 2 inside arrow function", async () => {
    const sourceAST = prepareAST(`
  		const x: string = "test";
      const a = () => x;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const x = actual.body.get("x");
    expect(errors.length).toBe(0);
    expect(x.type === Type.String).toBe(true);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType).toBe(x.type);
  });
  test("Inference global module function type 1 inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => {
      	return x;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(GenericType);
    expect(a.type.subordinateType.argumentsTypes.length).toBe(1);
    expect(a.type.subordinateType.argumentsTypes[0]).toBeInstanceOf(TypeVar);
    expect(
      a.type.subordinateType.returnType ===
        a.type.subordinateType.argumentsTypes[0]
    ).toBe(true);
  });
  test("Inference global module function type 2 inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => x;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(GenericType);
    expect(a.type.subordinateType.argumentsTypes.length).toBe(1);
    expect(a.type.subordinateType.argumentsTypes[0]).toBeInstanceOf(TypeVar);
    expect(
      a.type.subordinateType.returnType ===
        a.type.subordinateType.argumentsTypes[0]
    ).toBe(true);
  });
  test("Inference global module function type by arguments usage 1 inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => {
        return x - 2
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.Number).toBe(true);
  });
  test("Inference global module function type by arguments usage 2 inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => x - 2
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.Number).toBe(true);
  });
  test("Inference global module function type by inner function arguments usage 1 inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = (x) => {
  			return () => x - 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => () => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType).toBeInstanceOf(FunctionType);
    expect(a.type.returnType === Type.find("() => number")).toBe(true);
    expect(a.type.returnType.argumentsTypes.length).toBe(0);
    expect(a.type.returnType.returnType === Type.Number).toBe(true);
  });
  test("Inference global module function type by inner function arguments usage 2 inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => () => x - 2;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => () => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType).toBeInstanceOf(FunctionType);
    expect(a.type.returnType === Type.find("() => number")).toBe(true);
    expect(a.type.returnType.argumentsTypes.length).toBe(0);
    expect(a.type.returnType.returnType === Type.Number).toBe(true);
  });
  test("Inference global module function type by inner function arguments link inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => {
        const b = x;
        return b - 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const aScope = actual.scopes.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.Number).toBe(true);
    expect(aScope.body.get("b").type === Type.Number).toBe(true);
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
    const a = actual.body.get("a");
    const aScope = actual.scopes.get("[[Scope2-16]]");
    const fScope = actual.scopes.get("[[Scope3-18]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.Number).toBe(true);
    expect(aScope.body.get("f").type === Type.find("() => number")).toBe(true);
    expect(fScope.body.get("b").type === Type.Number).toBe(true);
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
    const a = actual.body.get("a");
    const aScope = actual.scopes.get("[[Scope2-16]]");
    const fScope = actual.scopes.get("[[Scope3-18]]");
    const f1Scope = actual.scopes.get("[[Scope4-21]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => string")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.String).toBe(true);
    expect(aScope.body.get("f").type === Type.find("() => string")).toBe(true);
    expect(fScope.body.get("f1").type === Type.find("() => undefined")).toBe(
      true
    );
    expect(f1Scope.body.get("f2").type === Type.find("() => number")).toBe(
      true
    );
  });
  test("Inference function local variable type inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => {
        const b = 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const aScope = actual.scopes.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(GenericType);
    expect(a.type.subordinateType.argumentsTypes.length).toBe(1);
    expect(a.type.subordinateType.returnType === Type.Undefined).toBe(true);
    expect(aScope.body.get("b").type === Type.find(2)).toBe(true);
  });
  test("Inference function local variable type by argument link inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => {
        const b = x;
        return x - 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const aScope = actual.scopes.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => number")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.Number).toBe(true);
    expect(aScope.body.get("b").type === Type.Number).toBe(true);
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
    const a = actual.body.get("a");
    const aScope = actual.scopes.get("[[Scope2-16]]");
    const fnScope = actual.scopes.get("[[Scope4-19]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type === Type.find("(number) => undefined")).toBe(true);
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(a.type.returnType === Type.Undefined).toBe(true);
    expect(aScope.body.get("fn").type).toBeInstanceOf(FunctionType);
    expect(aScope.body.get("fn").type === Type.find("() => number")).toBe(true);
    expect(aScope.body.get("fn").type.argumentsTypes.length).toBe(0);
    expect(aScope.body.get("fn").type.returnType === Type.Number).toBe(true);
    expect(fnScope.body.get("c").type === Type.Number).toBe(true);
  });
  test("Inference function with default paramter and type", async () => {
    const sourceAST = prepareAST(`
      const fn = (a = 1) => a;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const fn = actual.body.get("fn");
    expect(errors.length).toBe(0);
    expect(fn.type).toBeInstanceOf(FunctionType);
    expect(fn.type === Type.find("(number | undefined) => number")).toBe(true);
    expect(fn.type.argumentsTypes.length).toBe(1);
    expect(fn.type.argumentsTypes[0]).toBeInstanceOf(UnionType);
    expect(fn.type.argumentsTypes[0].variants.length).toBe(2);
    expect(fn.type.argumentsTypes[0].variants[0] === Type.Number).toBe(true);
    expect(fn.type.argumentsTypes[0].variants[1] === Type.Undefined).toBe(true);
    expect(fn.type.argumentsTypes[0] === Type.find("number | undefined")).toBe(
      true
    );
    expect(fn.type.returnType === Type.Number).toBe(true);
  });
  test("Inference function with default paramter and type", async () => {
    const sourceAST = prepareAST(`
      const fn = (a: ?number = 1) => a;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const fn = actual.body.get("fn");
    expect(errors.length).toBe(1);
    expect(errors[0]).toBeInstanceOf(HegelError);
    expect(errors[0].message).toBe(
      "Argument cannot be optional and has initializer."
    );
  });
  test("Inference function with default paramter and inner call", async () => {
    const sourceAST = prepareAST(`
      const getNum = () => 2;
      const fn = (a = getNum()) => a;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const fn = actual.body.get("fn");
    expect(errors.length).toBe(0);
    expect(fn.type).toBeInstanceOf(FunctionType);
    expect(fn.type === Type.find("(number | undefined) => number")).toBe(true);
    expect(fn.type.argumentsTypes.length).toBe(1);
    expect(fn.type.argumentsTypes[0]).toBeInstanceOf(UnionType);
    expect(fn.type.argumentsTypes[0].variants.length).toBe(2);
    expect(fn.type.argumentsTypes[0].variants[0] === Type.Number).toBe(true);
    expect(fn.type.argumentsTypes[0].variants[1] === Type.Undefined).toBe(true);
    expect(fn.type.argumentsTypes[0] === Type.find("number | undefined")).toBe(
      true
    );
    expect(fn.type.returnType === Type.Number).toBe(true);
  });
  test("Inference function with paramter application to generic function", async () => {
    const sourceAST = prepareAST(`
      const fn = (a: number) => a;
      const res = (a, b) => fn(a + b);
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const fn = actual.body.get("fn");
    const res = actual.body.get("res");
    expect(errors.length).toBe(0);
    expect(fn.type).toBeInstanceOf(FunctionType);
    expect(fn.type === Type.find("(number) => number")).toBe(true);
    expect(fn.type.argumentsTypes.length).toBe(1);
    expect(fn.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(fn.type.returnType === Type.Number).toBe(true);
    expect(res.type).toBeInstanceOf(FunctionType);
    expect(res.type === Type.find("(number, number) => number")).toBe(true);
    expect(res.type.argumentsTypes.length).toBe(2);
    expect(res.type.argumentsTypes[0] === Type.Number).toBe(true);
    expect(res.type.argumentsTypes[1] === Type.Number).toBe(true);
    expect(res.type.returnType === Type.Number).toBe(true);
  });
  test("Inference function with multiple paramter application to generic function", async () => {
    const sourceAST = prepareAST(`
      const g = (f, a, b) => f(a, b);
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const g = actual.body.get("g");
    expect(errors.length).toBe(0);
    expect(g.type).toBeInstanceOf(GenericType);
    expect(g.type.subordinateType.argumentsTypes.length).toBe(3);
    expect(g.type.subordinateType.argumentsTypes[0]).toBeInstanceOf(
      FunctionType
    );
    expect(g.type.subordinateType.argumentsTypes[0].argumentsTypes.length).toBe(
      2
    );
    expect(
      g.type.subordinateType.argumentsTypes[0].argumentsTypes[0] ===
        g.type.subordinateType.argumentsTypes[1]
    ).toBe(true);
    expect(
      g.type.subordinateType.argumentsTypes[0].argumentsTypes[1] ===
        g.type.subordinateType.argumentsTypes[2]
    ).toBe(true);
    expect(
      g.type.subordinateType.argumentsTypes[0].returnType ===
        g.type.subordinateType.returnType
    ).toBe(true);
    expect(g.type.subordinateType.argumentsTypes[1]).toBeInstanceOf(TypeVar);
    expect(g.type.subordinateType.argumentsTypes[2]).toBeInstanceOf(TypeVar);
    expect(g.type.subordinateType.returnType).toBeInstanceOf(TypeVar);
  });
  test("Inference function with multiple paramter application to generic function inside expression", async () => {
    const sourceAST = prepareAST(`
      const g = (f, a, b) => f(a, b) * 2;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const g = actual.body.get("g");
    expect(errors.length).toBe(0);
    expect(g.type).toBeInstanceOf(GenericType);
    expect(g.type.subordinateType.argumentsTypes.length).toBe(3);
    expect(g.type.subordinateType.argumentsTypes[0]).toBeInstanceOf(
      FunctionType
    );
    expect(g.type.subordinateType.argumentsTypes[0].argumentsTypes.length).toBe(
      2
    );
    expect(
      g.type.subordinateType.argumentsTypes[0].argumentsTypes[0] ===
        g.type.subordinateType.argumentsTypes[1]
    ).toBe(true);
    expect(
      g.type.subordinateType.argumentsTypes[0].argumentsTypes[1] ===
        g.type.subordinateType.argumentsTypes[2]
    ).toBe(true);
    expect(
      g.type.subordinateType.argumentsTypes[0].returnType ===
        g.type.subordinateType.returnType
    ).toBe(true);
    expect(g.type.subordinateType.argumentsTypes[1]).toBeInstanceOf(TypeVar);
    expect(g.type.subordinateType.argumentsTypes[2]).toBeInstanceOf(TypeVar);
    expect(g.type.subordinateType.returnType === Type.Number).toBe(true);
  });
  test("Inference function with function paramter application", async () => {
    const sourceAST = prepareAST(`
      const res = (a, b, c) => a * b * c;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const res = actual.body.get("res");
    expect(errors.length).toBe(0);
    expect(res.type).toBeInstanceOf(GenericType);
    expect(res.type.subordinateType.argumentsTypes.length).toBe(3);
    expect(res.type.subordinateType.argumentsTypes[0]).toBeInstanceOf(TypeVar);
    expect(
      res.type.subordinateType.argumentsTypes[0].constraint
    ).toBeInstanceOf(UnionType);
    expect(
      res.type.subordinateType.argumentsTypes[0].constraint ===
        Type.find("bigint | number")
    ).toBe(true);
    expect(
      res.type.subordinateType.argumentsTypes[0].constraint.variants.length
    ).toBe(2);
    expect(
      res.type.subordinateType.argumentsTypes[0].constraint.variants[0] ===
        Type.BigInt
    ).toBe(true);
    expect(
      res.type.subordinateType.argumentsTypes[0].constraint.variants[1] ===
        Type.Number
    ).toBe(true);
    expect(res.type.subordinateType.argumentsTypes[1]).toBeInstanceOf(TypeVar);
    expect(
      res.type.subordinateType.argumentsTypes[1].constraint
    ).toBeInstanceOf(UnionType);
    expect(
      res.type.subordinateType.argumentsTypes[1].constraint ===
        Type.find("bigint | number")
    ).toBe(true);
    expect(
      res.type.subordinateType.argumentsTypes[1].constraint.variants.length
    ).toBe(2);
    expect(
      res.type.subordinateType.argumentsTypes[1].constraint.variants[0] ===
        Type.BigInt
    ).toBe(true);
    expect(
      res.type.subordinateType.argumentsTypes[1].constraint.variants[1] ===
        Type.Number
    ).toBe(true);
    expect(res.type.subordinateType.returnType).toBeInstanceOf(TypeVar);
    expect(res.type.subordinateType.returnType.constraint).toBeInstanceOf(
      UnionType
    );
    expect(
      res.type.subordinateType.returnType.constraint ===
        Type.find("bigint | number")
    ).toBe(true);
    expect(res.type.subordinateType.returnType.constraint.variants.length).toBe(
      2
    );
    expect(
      res.type.subordinateType.returnType.constraint.variants[0] === Type.BigInt
    ).toBe(true);
    expect(
      res.type.subordinateType.returnType.constraint.variants[1] === Type.Number
    ).toBe(true);
  });
});
describe("Object type inference", () => {
  test("Inference object type with all simple types", async () => {
    const sourceAST = prepareAST(`
      const a = {
        1: 1,
        2: 2n,
        3: "3",
        4: true,
        5: Symbol("for"),
        6: null,
        7: undefined,
        8: /da/gi
      }
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type.properties.size).toBe(8);
    expect(
      a.type ===
        Type.find(
          "{ 1: number, 2: bigint, 3: string, 4: boolean, 5: symbol, 6: null, 7: undefined, 8: RegExp }"
        )
    ).toBe(true);
    expect(a.type.properties.get("1").type === Type.Number).toBe(true);
    expect(a.type.properties.get("2").type === Type.BigInt).toBe(true);
    expect(a.type.properties.get("3").type === Type.String).toBe(true);
    expect(a.type.properties.get("4").type === Type.Boolean).toBe(true);
    expect(a.type.properties.get("5").type === Type.Symbol).toBe(true);
    expect(a.type.properties.get("6").type === Type.Null).toBe(true);
    expect(a.type.properties.get("7").type === Type.Undefined).toBe(true);
    expect(a.type.properties.get("8").type === Type.find("RegExp")).toBe(true);
  });
  test("Inference object type with all function types", async () => {
    const sourceAST = prepareAST(`
      const a = {
        a() { return 2 },
        b: function(a) {},
        c: x => x
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type.properties.size).toBe(3);
    expect(
      a.type ===
        Type.find(
          "{ a: () => number, b: <_a>(_a) => undefined, c: <_a>(_a) => _a }"
        )
    ).toBe(true);
    expect(a.type.properties.get("a").type).toBeInstanceOf(FunctionType);
    expect(a.type.properties.get("a").type === Type.find("() => number")).toBe(
      true
    );
    expect(a.type.properties.get("a").type.argumentsTypes.length).toBe(0);
    expect(a.type.properties.get("a").type.returnType === Type.Number).toBe(
      true
    );
    expect(a.type.properties.get("b").type).toBeInstanceOf(GenericType);
    expect(
      a.type.properties.get("b").type === Type.find("<_a>(_a) => undefined")
    ).toBe(true);
    expect(
      a.type.properties.get("b").type.subordinateType.argumentsTypes.length
    ).toBe(1);
    expect(
      a.type.properties.get("b").type.subordinateType.argumentsTypes[0]
    ).toBeInstanceOf(TypeVar);
    expect(
      a.type.properties.get("b").type.subordinateType.returnType ===
        Type.Undefined
    ).toBe(true);
    expect(a.type.properties.get("c").type).toBeInstanceOf(GenericType);
    expect(
      a.type.properties.get("c").type === Type.find("<_a>(_a) => _a")
    ).toBe(true);
    expect(
      a.type.properties.get("c").type.subordinateType.argumentsTypes.length
    ).toBe(1);
    expect(
      a.type.properties.get("c").type.subordinateType.argumentsTypes[0]
    ).toBeInstanceOf(TypeVar);
    expect(
      a.type.properties.get("c").type.subordinateType.returnType
    ).toBeInstanceOf(TypeVar);
  });
  test("Inference object type with nested object", async () => {
    const sourceAST = prepareAST(`
      const a = {
        b: { c: () => 2 }
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(ObjectType);
    expect(a.type.properties.size).toBe(1);
    expect(a.type === Type.find("{ b: { c: () => number } }")).toBe(true);
    expect(a.type.properties.get("b").type).toBeInstanceOf(ObjectType);
    expect(a.type.properties.get("b").type.properties.size).toBe(1);
    expect(
      a.type.properties.get("b").type === Type.find("{ c: () => number }")
    ).toBe(true);
    expect(
      a.type.properties.get("b").type.properties.get("c").type
    ).toBeInstanceOf(FunctionType);
    expect(
      a.type.properties.get("b").type.properties.get("c").type ===
        Type.find("() => number")
    ).toBe(true);
    expect(
      a.type.properties.get("b").type.properties.get("c").type.argumentsTypes
        .length
    ).toBe(0);
    expect(
      a.type.properties.get("b").type.properties.get("c").type.returnType ===
        Type.Number
    ).toBe(true);
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
      mixTypeDefinitions()
    );
    const actualCatchScope = actual.scopes.get("[[Scope4-17]]");
    const e = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(e.type).toBeInstanceOf(UnionType);
    expect(e.type.variants.length).toBe(2);
    expect(e.type.variants[0] === Type.find("Error")).toBe(true);
    expect(e.type.variants[1] === Type.Unknown).toBe(true);
    expect(e.type === Type.find("Error | unknown")).toBe(true);
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
      mixTypeDefinitions()
    );
    const actualCatchScope = actual.scopes.get("[[Scope4-17]]");
    const e = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(e.type).toBeInstanceOf(UnionType);
    expect(e.type.variants.length).toBe(2);
    expect(e.type.variants[0] === Type.find("SyntaxError")).toBe(true);
    expect(e.type.variants[1] === Type.Unknown).toBe(true);
    expect(e.type === Type.find("SyntaxError | unknown")).toBe(true);
  });
  test("Inference simple throw with primitive type", async () => {
    const sourceAST = prepareAST(`
      try {
        throw 2;
      } catch(e) {}
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.scopes.get("[[Scope4-17]]");
    const e = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(e.type).toBeInstanceOf(UnionType);
    expect(e.type.variants.length).toBe(2);
    expect(e.type.variants[0] === Type.Number).toBe(true);
    expect(e.type.variants[1] === Type.Unknown).toBe(true);
    expect(e.type === Type.find("number | unknown")).toBe(true);
  });
  test("Inference simple throw with object type", async () => {
    const sourceAST = prepareAST(`
      try {
        throw { message: "test" };
      } catch(e) {}
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.scopes.get("[[Scope4-17]]");
    const e = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(e.type).toBeInstanceOf(UnionType);
    expect(e.type.variants.length).toBe(2);
    expect(e.type.variants[0] === Type.find("{ message: string }")).toBe(true);
    expect(e.type.variants[1] === Type.Unknown).toBe(true);
    expect(e.type === Type.find("{ message: string } | unknown")).toBe(true);
  });
  test("Inference simple throw with anonymous function type", async () => {
    const sourceAST = prepareAST(`
      try {
        throw function() {};
      } catch(e) {}
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.scopes.get("[[Scope4-17]]");
    const e = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(e.type).toBeInstanceOf(UnionType);
    expect(e.type.variants.length).toBe(2);
    expect(e.type.variants[0] === Type.find("() => undefined")).toBe(true);
    expect(e.type.variants[0].argumentsTypes.length).toBe(0);
    expect(e.type.variants[0].returnType === Type.Undefined).toBe(true);
    expect(e.type.variants[1] === Type.Unknown).toBe(true);
    expect(e.type === Type.find("(() => undefined) | unknown")).toBe(true);
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
    const actualCatchScope = actual.scopes.get("[[Scope4-17]]");
    const e = actualCatchScope.body.get("e");
    const a = actualCatchScope.body.get("a");
    expect(errors.length).toBe(0);
    expect(e.type).toBeInstanceOf(UnionType);
    expect(e.type.variants.length).toBe(2);
    expect(e.type.variants[0] === Type.Number).toBe(true);
    expect(e.type.variants[1] === Type.Unknown).toBe(true);
    expect(e.type === Type.find("number | unknown")).toBe(true);
    expect(e.type === a.type).toBe(true);
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
    const actualCatchScope = actual.scopes.get("[[Scope7-17]]");
    const e = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(e.type).toBeInstanceOf(UnionType);
    expect(e.type.variants.length).toBe(2);
    expect(e.type.variants[0] === Type.Number).toBe(true);
    expect(e.type.variants[1] === Type.Unknown).toBe(true);
    expect(e.type === Type.find("number | unknown")).toBe(true);
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
    const actualCatchScope = actual.scopes.get("[[Scope8-17]]");
    const e = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(e.type).toBeInstanceOf(UnionType);
    expect(e.type.variants.length).toBe(2);
    expect(e.type.variants[0] === Type.Number).toBe(true);
    expect(e.type.variants[1] === Type.Unknown).toBe(true);
    expect(e.type === Type.find("number | unknown")).toBe(true);
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
    const actualCatchScope = actual.scopes.get("[[Scope9-17]]");
    const e = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(e.type).toBeInstanceOf(UnionType);
    expect(e.type.variants.length).toBe(2);
    expect(e.type.variants[0] === Type.Number).toBe(true);
    expect(e.type.variants[1] === Type.Unknown).toBe(true);
    expect(e.type === Type.find("number | unknown")).toBe(true);
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
      mixTypeDefinitions()
    );
    const arr = actual.body.get("arr");
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(arr.type).toBeInstanceOf(CollectionType);
    expect(arr.type === Type.find("Array<number>")).toBe(true);
    expect(arr.type.keyType === Type.Number).toBe(true);
    expect(arr.type.valueType === Type.Number).toBe(true);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("number | undefined")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Number).toBe(true);
    expect(a.type.variants[1] === Type.Undefined).toBe(true);
  });
  test("Simple inference of array type when setting value", async () => {
    const sourceAST = prepareAST(`
      const arr: Array<number> = [];
      arr[0] = undefined;
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toBe(1);
    expect(errors[0].message).toBe(
      'Type "undefined" is incompatible with type "number"'
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
      mixTypeDefinitions()
    );
    expect(errors.length).toBe(1);
    expect(errors[0].message).toBe(
      'Property "0" does not exist in "Array<number>"'
    );
  });
});
describe("Type refinement", () => {
  test("Strict equals refinement for union variable(undefined and number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | undefined = 2;
      if (a === undefined) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-27]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("number | undefined")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Number).toBe(true);
    expect(a.type.variants[1] === Type.Undefined).toBe(true);
    expect(b.type === Type.Undefined).toBe(true);
  });
  test("Negative strict equals refinement for union variable(undefined and number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | undefined = 2;
      if (a !== undefined) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-27]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("number | undefined")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Number).toBe(true);
    expect(a.type.variants[1] === Type.Undefined).toBe(true);
    expect(b.type === Type.Number).toBe(true);
  });
  test("Strict equals refinement for union variable(null and number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | null = 2;
      if (a === null) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-22]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("null | number")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Null).toBe(true);
    expect(a.type.variants[1] === Type.Number).toBe(true);
    expect(b.type === Type.Null).toBe(true);
  });
  test("Negative strict equals refinement for union variable(null and number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | null = 2;
      if (a !== null) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-22]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("null | number")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Null).toBe(true);
    expect(a.type.variants[1] === Type.Number).toBe(true);
    expect(b.type === Type.Number).toBe(true);
  });
  test("Not strict equals refinement for union variable(undefined and number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | undefined = 2;
      if (a == null) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-21]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("number | undefined")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Number).toBe(true);
    expect(a.type.variants[1] === Type.Undefined).toBe(true);
    expect(b.type === Type.Undefined).toBe(true);
  });
  test("Negative not strict equals refinement for union variable(undefined and number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | undefined | null = 2;
      if (a != undefined) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-26]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("null | number | undefined")).toBe(true);
    expect(a.type.variants.length).toBe(3);
    expect(a.type.variants[0] === Type.Null).toBe(true);
    expect(a.type.variants[1] === Type.Number).toBe(true);
    expect(a.type.variants[2] === Type.Undefined).toBe(true);
    expect(b.type === Type.Number).toBe(true);
  });
  test("Not strict equals refinement for union variable(null and number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | null = 2;
      if (a == null) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-21]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("null | number")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Null).toBe(true);
    expect(a.type.variants[1] === Type.Number).toBe(true);
    expect(b.type === Type.Null).toBe(true);
  });
  test("Negative not strict equals refinement for union variable(null and number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | null | undefined = 2;
      if (a != null) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-21]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("null | number | undefined")).toBe(true);
    expect(a.type.variants.length).toBe(3);
    expect(a.type.variants[0] === Type.Null).toBe(true);
    expect(a.type.variants[1] === Type.Number).toBe(true);
    expect(a.type.variants[2] === Type.Undefined).toBe(true);
    expect(b.type === Type.Number).toBe(true);
  });
  test("Typeof refinement for union variable(number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | string = 2;
      if (typeof a === "number") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-33]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("number | string")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Number).toBe(true);
    expect(a.type.variants[1] === Type.String).toBe(true);
    expect(b.type === Type.Number).toBe(true);
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
    const actualScope = actual.scopes.get("[[Scope4-13]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("number | string")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Number).toBe(true);
    expect(a.type.variants[1] === Type.String).toBe(true);
    expect(b.type === Type.String).toBe(true);
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
    const actualScope = actual.scopes.get("[[Scope4-40]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("boolean | number | string")).toBe(true);
    expect(a.type.variants.length).toBe(3);
    expect(a.type.variants[0] === Type.Boolean).toBe(true);
    expect(a.type.variants[1] === Type.Number).toBe(true);
    expect(a.type.variants[2] === Type.String).toBe(true);
    expect(b.type === Type.Boolean).toBe(true);
  });
  test("Typeof refinement for union variable(string)", async () => {
    const sourceAST = prepareAST(`
      const a: number | string = 2;
      if (typeof a === "string") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-33]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("number | string")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Number).toBe(true);
    expect(a.type.variants[1] === Type.String).toBe(true);
    expect(b.type === Type.String).toBe(true);
  });
  test("Typeof refinement for union variable(boolean)", async () => {
    const sourceAST = prepareAST(`
      const a: number | boolean = 2;
      if (typeof a === "boolean") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-34]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("boolean | number")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Boolean).toBe(true);
    expect(a.type.variants[1] === Type.Number).toBe(true);
    expect(b.type === Type.Boolean).toBe(true);
  });
  test("Typeof refinement for union variable(number literal)", async () => {
    const sourceAST = prepareAST(`
      const a: 2 | string = 2;
      if (typeof a === "number") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-33]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("2 | string")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find(2)).toBe(true);
    expect(a.type.variants[1] === Type.String).toBe(true);
    expect(b.type === Type.find(2)).toBe(true);
  });
  test("Equals refinement for union variable(number literal)", async () => {
    const sourceAST = prepareAST(`
      const a: 2 | string = 2;
      if (a === 2) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-19]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("2 | string")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find(2)).toBe(true);
    expect(a.type.variants[1] === Type.String).toBe(true);
    expect(b.type === Type.find(2)).toBe(true);
  });
  test("Equals refinement for union variable(number literal)", async () => {
    const sourceAST = prepareAST(`
      const a: number | string = 2;
      if (a === 2) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-19]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("number | string")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Number).toBe(true);
    expect(a.type.variants[1] === Type.String).toBe(true);
    expect(b.type === Type.find(2)).toBe(true);
  });
  test("Typeof refinement for union variable(string literal)", async () => {
    const sourceAST = prepareAST(`
      const a: "2" | number = "2";
      if (typeof a === "string") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-33]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("'2' | number")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find("'2'")).toBe(true);
    expect(a.type.variants[1] === Type.Number).toBe(true);
    expect(b.type === Type.find("'2'")).toBe(true);
  });
  test("Equals refinement for union variable(string literal)", async () => {
    const sourceAST = prepareAST(`
      const a: "2" | number = "2";
      if (a === "2") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-21]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("'2' | number")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find("'2'")).toBe(true);
    expect(a.type.variants[1] === Type.Number).toBe(true);
    expect(b.type === Type.find("'2'")).toBe(true);
  });
  test("Equals refinement for union variable(string literal)", async () => {
    const sourceAST = prepareAST(`
      const a: string | number = "2";
      if (a === "2") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-21]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("number | string")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Number).toBe(true);
    expect(a.type.variants[1] === Type.String).toBe(true);
    expect(b.type === Type.find("'2'")).toBe(true);
  });
  test("Typeof refinement for union variable(boolean literal)", async () => {
    const sourceAST = prepareAST(`
      const a: true | number = true;
      if (typeof a === "boolean") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-34]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("number | true")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Number).toBe(true);
    expect(a.type.variants[1] === Type.find(true)).toBe(true);
    expect(b.type === Type.find(true)).toBe(true);
  });
  test("Equals refinement for union variable(boolean literal)", async () => {
    const sourceAST = prepareAST(`
      const a: true | number = true;
      if (a === true) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-22]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("number | true")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Number).toBe(true);
    expect(a.type.variants[1] === Type.find(true)).toBe(true);
    expect(b.type === Type.find(true)).toBe(true);
  });
  test("Equals refinement for union variable(boolean literal)", async () => {
    const sourceAST = prepareAST(`
      const a: boolean | number = true;
      if (a === true) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-22]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("boolean | number")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Boolean).toBe(true);
    expect(a.type.variants[1] === Type.Number).toBe(true);
    expect(b.type === Type.find(true)).toBe(true);
  });
  test("Typeof refinement for union variable(object)", async () => {
    const sourceAST = prepareAST(`
      const a: number | { a: number } = 2;
      if (typeof a === "object") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-33]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("{ a: number } | number")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBeInstanceOf(ObjectType);
    expect(a.type.variants[0] === Type.find("{ a: number }")).toBe(true);
    expect(a.type.variants[1] === Type.Number).toBe(true);
    expect(b.type === Type.find("{ a: number }")).toBe(true);
  });
  test("Typeof refinement for union variable(null)", async () => {
    const sourceAST = prepareAST(`
      const a: number | null = 2;
      if (typeof a === "object") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-33]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("null | number")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Null).toBe(true);
    expect(a.type.variants[1] === Type.Number).toBe(true);
    expect(b.type === Type.Null).toBe(true);
  });
  test("Typeof refinement for union variable(function)", async () => {
    const sourceAST = prepareAST(`
      const a: number | () => number = 2;
      if (typeof a === "function") {
        const b = a;
      }
    `);
    const [[actual], errors, global] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-35]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("(() => number) | number")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find("() => number")).toBe(true);
    expect(a.type.variants[1] === Type.Number).toBe(true);
    expect(b.type === Type.find("() => number")).toBe(true);
  });
  test("Typeof refinement for union property(number)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: string } | { b: number, c: number } = { b: "2" };
      if (typeof a.b === "number") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-35]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(
      a.type === Type.find("{ b: number, c: number } | { b: string }")
    ).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find("{ b: number, c: number }")).toBe(
      true
    );
    expect(a.type.variants[1] === Type.find("{ b: string }")).toBe(true);
    expect(b.type === Type.find("{ b: number, c: number }")).toBe(true);
  });
  test("Equals refinement for union property(number)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: string } | { b: 2, c: number } = { b: "2" };
      if (a.b === 2) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-21]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("{ b: 2, c: number } | { b: string }")).toBe(
      true
    );
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find("{ b: 2, c: number }")).toBe(true);
    expect(a.type.variants[1] === Type.find("{ b: string }")).toBe(true);
    expect(b.type === Type.find("{ b: 2, c: number }")).toBe(true);
  });
  test("Equals refinement for union property(number)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: string } | { b: number, c: number } = { b: "2" };
      if (a.b === 2) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-21]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(
      a.type === Type.find("{ b: number, c: number } | { b: string }")
    ).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find("{ b: number, c: number }")).toBe(
      true
    );
    expect(a.type.variants[1] === Type.find("{ b: string }")).toBe(true);
    expect(b.type === Type.find("{ b: 2, c: number }")).toBe(true);
  });
  test("Typeof refinement for union property(string)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: number } | { b: string, c: number } = { b: 2 };
      if (typeof a.b === "string") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-35]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(
      a.type === Type.find("{ b: number } | { b: string, c: number }")
    ).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find("{ b: number }")).toBe(true);
    expect(a.type.variants[1] === Type.find("{ b: string, c: number }")).toBe(
      true
    );
    expect(b.type === Type.find("{ b: string, c: number }")).toBe(true);
  });
  test("Equals refinement for union property(string)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: number } | { b: "2", c: number } = { b: 2 };
      if (a.b === "2") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-23]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("{ b: '2', c: number } | { b: number }")).toBe(
      true
    );
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find("{ b: '2', c: number }")).toBe(
      true
    );
    expect(a.type.variants[1] === Type.find("{ b: number }")).toBe(true);
    expect(b.type === Type.find("{ b: '2', c: number }")).toBe(true);
  });
  test("Typeof refinement for union variable(boolean)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: number } | { b: boolean, c: number } = { b: 2 };
      if (typeof a.b === "boolean") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-36]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(
      a.type === Type.find("{ b: boolean, c: number } | { b: number }")
    ).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find("{ b: boolean, c: number }")).toBe(
      true
    );
    expect(a.type.variants[1] === Type.find("{ b: number }")).toBe(true);
    expect(b.type === Type.find("{ b: boolean, c: number }")).toBe(true);
  });
  test("Typeof refinement for union property(number literal)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: string } | { b: 2, c: number } = { b: "2" };
      if (typeof a.b === "number") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-35]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("{ b: 2, c: number } | { b: string }")).toBe(
      true
    );
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find("{ b: 2, c: number }")).toBe(true);
    expect(a.type.variants[1] === Type.find("{ b: string }")).toBe(true);
    expect(b.type === Type.find("{ b: 2, c: number }")).toBe(true);
  });
  test("Typeof refinement for union property(string literal)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: number } | { b: "2", c: number } = { b: 2 };
      if (typeof a.b === "string") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-35]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("{ b: '2', c: number } | { b: number }")).toBe(
      true
    );
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find("{ b: '2', c: number }")).toBe(
      true
    );
    expect(a.type.variants[1] === Type.find("{ b: number }")).toBe(true);
    expect(b.type === Type.find("{ b: '2', c: number }")).toBe(true);
  });
  test("Typeof refinement for union property(boolean literal)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: string } | { b: true, c: number } = { b: "2" };
      if (typeof a.b === "boolean") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-36]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("{ b: string } | { b: true, c: number }")).toBe(
      true
    );
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find("{ b: string }")).toBe(true);
    expect(a.type.variants[1] === Type.find("{ b: true, c: number }")).toBe(
      true
    );
    expect(b.type === Type.find("{ b: true, c: number }")).toBe(true);
  });
  test("Typeof refinement for union variable(object)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: number } | { b: { d: number }, c: number } = { b: 2 };
      if (typeof a.b === "object") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-35]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(
      a.type === Type.find("{ b: { d: number }, c: number } | { b: number }")
    ).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(
      a.type.variants[0] === Type.find("{ b: { d: number }, c: number }")
    ).toBe(true);
    expect(a.type.variants[1] === Type.find("{ b: number }")).toBe(true);
    expect(b.type === Type.find("{ b: { d: number }, c: number }")).toBe(true);
  });
  test("Typeof refinement for union property(function)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: number } | { b: () => number, c: number } = { b: 2 };
      if (typeof a.b === "function") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-37]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(
      a.type === Type.find("{ b: () => number, c: number } | { b: number }")
    ).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(
      a.type.variants[0] === Type.find("{ b: () => number, c: number }")
    ).toBe(true);
    expect(a.type.variants[1] === Type.find("{ b: number }")).toBe(true);
    expect(b.type === Type.find("{ b: () => number, c: number }")).toBe(true);
  });
  test("Multiple typeof refinement for union variable", async () => {
    const sourceAST = prepareAST(`
      const a: number | boolean | string = 2;
      if (typeof a === "number" || typeof a === "string") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-58]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("boolean | number | string")).toBe(true);
    expect(a.type.variants.length).toBe(3);
    expect(a.type.variants[0] === Type.Boolean).toBe(true);
    expect(a.type.variants[1] === Type.Number).toBe(true);
    expect(a.type.variants[2] === Type.String).toBe(true);
    expect(b.type === Type.find("number | string")).toBe(true);
  });
  test("Multiple typeof refinement for property", async () => {
    const sourceAST = prepareAST(`
      const a: { a: string } | { a: number, b: string } | { a: number, b: number } = { a: 2, b: 2 };
      if (typeof a.a === "number" && typeof a.b === "number") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-62]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(
      a.type ===
        Type.find(
          "{ a: number, b: number } | { a: number, b: string } | { a: string }"
        )
    ).toBe(true);
    expect(a.type.variants.length).toBe(3);
    expect(a.type.variants[0] === Type.find("{ a: number, b: number }")).toBe(
      true
    );
    expect(a.type.variants[1] === Type.find("{ a: number, b: string }")).toBe(
      true
    );
    expect(a.type.variants[2] === Type.find("{ a: string }")).toBe(true);
    expect(b.type === Type.find("{ a: number, b: number }")).toBe(true);
  });
  test("After throw inside refinement", async () => {
    const sourceAST = prepareAST(`
      const a: number | string = 2;
      if (typeof a === "number") {
        throw {};
      }
      const b = a;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope5-7]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("number | string")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Number).toBe(true);
    expect(a.type.variants[1] === Type.String).toBe(true);
    expect(b.type === Type.String).toBe(true);
  });
  test("And operator inference", async () => {
    const sourceAST = prepareAST(`
      const a: number | null = 2;
      const b = a && a.toString();
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const a = actual.body.get("a");
    const b = actual.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("null | number")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Null).toBe(true);
    expect(a.type.variants[1] === Type.Number).toBe(true);
    expect(b.type).toBeInstanceOf(UnionType);
    expect(b.type === Type.find("0 | null | string")).toBe(true);
    expect(b.type.variants.length).toBe(3);
    expect(b.type.variants[0] === Type.find(0)).toBe(true);
    expect(b.type.variants[1] === Type.Null).toBe(true);
    expect(b.type.variants[2] === Type.String).toBe(true);
  });
  test("Or operator inference", async () => {
    const sourceAST = prepareAST(`
      const a: number | null = 2;
      const b = a || 4;
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const a = actual.body.get("a");
    const b = actual.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("null | number")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.Null).toBe(true);
    expect(a.type.variants[1] === Type.Number).toBe(true);
    expect(b.type).toBeInstanceOf(UnionType);
    expect(b.type === Type.find("4 | number")).toBe(true);
    expect(b.type.variants.length).toBe(2);
    expect(b.type.variants[0] === Type.find(4)).toBe(true);
    expect(b.type.variants[1] === Type.Number).toBe(true);
  });
  test("Typeof refinement for property in nested member expression", async () => {
    const sourceAST = prepareAST(`
      const a: { a: { b: number } } | { a: { b: string }, b: string } = { a: { b: 2 } };
      if (typeof a.a.b === "number") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-37]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(
      a.type ===
        Type.find("{ a: { b: number } } | { a: { b: string }, b: string }")
    ).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find("{ a: { b: number } }")).toBe(true);
    expect(
      a.type.variants[1] === Type.find("{ a: { b: string }, b: string }")
    ).toBe(true);
    expect(b.type === Type.find("{ a: { b: number } }")).toBe(true);
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
    expect(errors[0]).toBeInstanceOf(HegelError);
    expect(errors[0].message).toBe('Property is always "number"');
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
    expect(errors[0]).toBeInstanceOf(HegelError);
    expect(errors[0].message).toBe(
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
      mixTypeDefinitions()
    );
    const actualScope = actual.scopes.get("[[Scope3-30]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("Array<number> | number")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find("Array<number>")).toBe(true);
    expect(a.type.variants[1] === Type.Number).toBe(true);
    expect(b.type === Type.find("Array<number>")).toBe(true);
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
      mixTypeDefinitions()
    );
    const actualScope = actual.scopes.get("[[Scope3-32]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("{ b: Array<number> } | { b: number }")).toBe(
      true
    );
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find("{ b: Array<number> }")).toBe(true);
    expect(a.type.variants[1] === Type.find("{ b: number }")).toBe(true);
    expect(b.type === Type.find("{ b: Array<number> }")).toBe(true);
  });
  test("In refinement for union variable", async () => {
    const sourceAST = prepareAST(`
      const a: { a: number } | { b: string } = { a: 2 };
      if ('a' in a) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-20]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type === Type.find("{ a: number } | { b: string }")).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find("{ a: number }")).toBe(true);
    expect(a.type.variants[1] === Type.find("{ b: string }")).toBe(true);
    expect(b.type === Type.find("{ a: number }")).toBe(true);
  });
  test("In refinement for union property", async () => {
    const sourceAST = prepareAST(`
      const a: { a: { b: string } | { c: string } } = { a: { b: '2' } };
      if ('b' in a.a) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-22]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type === Type.find("{ a: { b: string } | { c: string } }")).toBe(
      true
    );
    expect(b.type === Type.find("{ a: { b: string } }")).toBe(true);
  });
  test("In refinement for property in union variable", async () => {
    const sourceAST = prepareAST(`
      const a: { a: { c: string } } | { a: { b: string } } = { a: { b: '2' } };
      if ('b' in a.a) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.scopes.get("[[Scope3-22]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(
      a.type === Type.find("{ a: { b: string } } | { a: { c: string } }")
    ).toBe(true);
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0] === Type.find("{ a: { b: string } }")).toBe(true);
    expect(a.type.variants[1] === Type.find("{ a: { c: string } }")).toBe(true);
    expect(b.type === Type.find("{ a: { b: string } }")).toBe(true);
  });
});
describe("Other", () => {
  test("Should inference paramtetric polymorphism", async () => {
    const sourceAST = prepareAST(`
      const id = x => x;
      const a = id(2);
      const b = id("str");
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const b = actual.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type === Type.find(2)).toBe(true);
    expect(b.type === Type.find("'str'")).toBe(true);
  });
  test("Should inference paramtetric polymorphism", async () => {
    const sourceAST = prepareAST(`
      const id = x => x;
      let a = id(2);
      let b = id("str");
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const b = actual.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type === Type.Number).toBe(true);
    expect(b.type === Type.String).toBe(true);
  });
  test("Should inference function type inside call", async () => {
    const sourceAST = prepareAST(`
       const a = [1, 2, 3].map(a => a.toString());
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const a = actual.body.get("a").type;
    expect(errors.length).toBe(0);
    expect(a).toBeInstanceOf(CollectionType);
    expect(a === Type.find("Array<string>")).toBe(true);
    expect(a.keyType === Type.Number).toBe(true);
    expect(a.valueType === Type.String).toBe(true);
  });
  test("Should inference function promised type", async () => {
    const sourceAST = prepareAST(`
       function promisify<Input, Output>(fn: (Input) => Output) {
         return a => Promise.resolve(fn(a));
       }
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const promisify = actual.body.get("promisify").type;
    expect(errors.length).toBe(0);
    expect(promisify).toBeInstanceOf(GenericType);
    expect(promisify.subordinateType).toBeInstanceOf(FunctionType);
    expect(
      promisify ===
        Type.find(
          "<Input, Output>((Input) => Output) => (Input) => Promise<Output>"
        )
    ).toBe(true);
  });
  test("Should inference generic function if generic function was provided as argument", async () => {
    const sourceAST = prepareAST(`
       function promisify<Input, Output>(fn: (Input) => Output) {
         return a => Promise.resolve(fn(a));
       }

       const mid = promisify(x => x);
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const mid = actual.body.get("mid").type;
    expect(errors.length).toBe(0);
    expect(mid).toBeInstanceOf(GenericType);
    expect(mid.subordinateType).toBeInstanceOf(FunctionType);
    expect(mid.subordinateType.argumentsTypes.length).toBe(1);
    expect(mid.subordinateType.argumentsTypes[0]).toBeInstanceOf(TypeVar);
  });
  test("Should inference right type inside Promise.then", async () => {
    const sourceAST = prepareAST(`
       function promisify<Input, Output>(fn: (Input) => Output) {
         return a => Promise.resolve(fn(a));
       }

       const res = promisify(x => x)(2).then(String);
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const actualRes = actual.body.get("res").type;
    expect(errors.length).toBe(0);
    expect(actualRes).toBeInstanceOf(ObjectType);
    expect(actualRes === Type.find("Promise<string>")).toBe(true);
  });
  test("Should inference right arguments types inside lambda-argument", async () => {
    const sourceAST = prepareAST(`
       const res = [1, 2, 3].map((element, index, self) => index);
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const res = actual.body.get("res").type;
    const lambda = actual.body.get("[[Anonymuos2-33]]").type;
    expect(errors.length).toBe(0);
    expect(res).toBeInstanceOf(CollectionType);
    expect(res === Type.find("Array<number>")).toBe(true);
    expect(res.valueType === Type.Number).toBe(true);
    expect(lambda).toBeInstanceOf(FunctionType);
    expect(
      lambda === Type.find("(1 | 2 | 3, number, Array<1 | 2 | 3>) => number")
    ).toBe(true);
    expect(lambda.argumentsTypes[0]).toBeInstanceOf(UnionType);
    expect(lambda.argumentsTypes[0] === Type.find("1 | 2 | 3")).toBe(true);
    expect(lambda.argumentsTypes[0].variants.length).toBe(3);
    expect(lambda.argumentsTypes[0].variants[0] === Type.find(1)).toBe(true);
    expect(lambda.argumentsTypes[0].variants[1] === Type.find(2)).toBe(true);
    expect(lambda.argumentsTypes[0].variants[2] === Type.find(3)).toBe(true);
    expect(lambda.argumentsTypes[1] === Type.Number).toBe(true);
    expect(lambda.argumentsTypes[2]).toBeInstanceOf(CollectionType);
    expect(lambda.argumentsTypes[2] === Type.find("Array<1 | 2 | 3>")).toBe(
      true
    );
    expect(lambda.argumentsTypes[2].valueType === Type.find("1 | 2 | 3")).toBe(
      true
    );
    expect(lambda.argumentsTypes[2].valueType.variants.length).toBe(3);
    expect(
      lambda.argumentsTypes[2].valueType.variants[0] === Type.find(1)
    ).toBe(true);
    expect(
      lambda.argumentsTypes[2].valueType.variants[1] === Type.find(2)
    ).toBe(true);
    expect(
      lambda.argumentsTypes[2].valueType.variants[2] === Type.find(3)
    ).toBe(true);
    expect(lambda.returnType === Type.Number).toBe(true);
  });
});
