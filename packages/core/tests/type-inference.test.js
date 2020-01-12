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
    expect(actual.body.get("a").type).toBe(Type.find(2));
  });
  test("Inference global module constant variable with number type", async () => {
    const sourceAST = prepareAST(`
      let a = 2;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type).toBe(Type.Number);
  });
  test("Inference global module constant with boolean type", async () => {
    const sourceAST = prepareAST(`
      const a = true;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type).toBe(Type.find(true));
  });
  test("Inference global module variable with boolean type", async () => {
    const sourceAST = prepareAST(`
      let a = true;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type).toBe(Type.Boolean);
  });
  test("Inference global module constant with string type", async () => {
    const sourceAST = prepareAST(`
      const a = "test";
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type).toBe(Type.find("'test'"));
  });
  test("Inference global module variable with string type", async () => {
    const sourceAST = prepareAST(`
      let a = "test";
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type).toBe(Type.String);
  });
  test("Inference global module constant with null type", async () => {
    const sourceAST = prepareAST(`
      const a = null;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type).toBe(Type.Null);
  });
  test("Inference global module variable with null type", async () => {
    const sourceAST = prepareAST(`
      let a = null;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type).toBe(Type.Null);
  });
  test("Inference global module constant with undefined type", async () => {
    const sourceAST = prepareAST(`
      const a = undefined;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type).toBe(Type.Undefined);
  });
  test("Inference global module variable with undefined type", async () => {
    const sourceAST = prepareAST(`
      let a = undefined;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
    expect(actual.body.get("a").type).toBe(Type.Undefined);
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
    expect(a.type).toBe(Type.find("{  }"));
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
    expect(a.type).toBe(Type.find("{  }"));
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
    expect(a).toBe(Type.find("[]"));
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
    expect(a).toBeInstanceOf(TupleType);
    expect(a).toBe(Type.find("[]"));
    expect(a.items.length).toBe(0);
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
    expect(a).toBe(Type.find("[2]"));
    expect(a.items.length).toBe(1);
    expect(a.items[0]).toBe(Type.find(2));
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
    expect(a).toBeInstanceOf(TupleType);
    expect(a).toBe(Type.find("[2]"));
    expect(a.items.length).toBe(1);
    expect(a.items[0]).toBe(Type.find(2));
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
    expect(a).toBe(Type.find("[2, '2']"));
    expect(a.items.length).toBe(2);
    expect(a.items[0]).toBe(Type.find(2));
    expect(a.items[1]).toBe(Type.find("'2'"));
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
    expect(a).toBeInstanceOf(TupleType);
    expect(a).toBe(Type.find("[2, '2']"));
    expect(a.items.length).toBe(2);
    expect(a.items[0]).toBe(Type.find(2));
    expect(a.items[1]).toBe(Type.find("'2'"));
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
    expect(a).toBe(Type.find("{ a: number }"));
    expect(a.properties.get("a").type).toBe(Type.Number);
    expect(b).toBe(Type.Number);
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
    expect(a.type).toBe(Type.find("() => undefined"));
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType).toBe(Type.Undefined);
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
    expect(getA.type).toBe(Type.find("() => number"));
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBe(Type.Number);
    expect(a.type).toBe(getA.type.returnType);
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
    expect(getA.type).toBe(Type.find("() => boolean"));
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBe(Type.Boolean);
    expect(a.type).toBe(getA.type.returnType);
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
    expect(getA.type).toBe(Type.find("() => string"));
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBe(Type.String);
    expect(a.type).toBe(getA.type.returnType);
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
    expect(getA.type).toBe(Type.find("() => null"));
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBe(Type.Null);
    expect(a.type).toBe(getA.type.returnType);
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
    expect(getA.type).toBe(Type.find("() => undefined"));
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBe(Type.Undefined);
    expect(a.type).toBe(getA.type.returnType);
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
    expect(getA.type).toBe(Type.find("() => undefined"));
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBe(Type.Undefined);
    expect(a.type).toBe(getA.type.returnType);
  });
  test("Inference global module variable with unknown type", async () => {
    const sourceAST = prepareAST(`
      function getA(): unknown {
      }
      const a = getA();
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const getA = actual.body.get("getA");
    expect(errors.length).toBe(0);
    expect(getA.type).toBeInstanceOf(FunctionType);
    expect(getA.type).toBe(Type.find("() => unknown"));
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBe(Type.Unknown);
    expect(a.type).toBe(getA.type.returnType);
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
    expect(getA.type).toBe(Type.find("() => number | string"));
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBeInstanceOf(UnionType);
    expect(getA.type.returnType.variants.length).toBe(2);
    expect(getA.type.returnType.variants[0]).toBe(Type.Number);
    expect(getA.type.returnType.variants[1]).toBe(Type.String);
    expect(getA.type.returnType).toBe(Type.find("number | string"));
    expect(a.type).toBe(getA.type.returnType);
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
    expect(getA.type).toBe(Type.find("() => [string, number]"));
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBeInstanceOf(TupleType);
    expect(getA.type.returnType.items.length).toBe(2);
    expect(getA.type.returnType.items[0]).toBe(Type.String);
    expect(getA.type.returnType.items[1]).toBe(Type.Number);
    expect(getA.type.returnType).toBe(Type.find("[string, number]"));
    expect(a.type).toBe(getA.type.returnType);
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
    expect(getA.type).toBe(Type.find("() => number | undefined"));
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBeInstanceOf(UnionType);
    expect(getA.type.returnType.variants.length).toBe(2);
    expect(getA.type.returnType.variants[0]).toBe(Type.Number);
    expect(getA.type.returnType.variants[1]).toBe(Type.Undefined);
    expect(getA.type.returnType).toBe(Type.find("number | undefined"));
    expect(a.type).toBe(getA.type.returnType);
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
    expect(getA.type).toBe(Type.find("() => { a: number }"));
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBeInstanceOf(ObjectType);
    expect(getA.type.returnType.properties.size).toBe(1);
    expect(getA.type.returnType.properties.get("a").type).toBe(Type.Number);
    expect(getA.type.returnType).toBe(Type.find("{ a: number }"));
    expect(a.type).toBe(getA.type.returnType);
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
    expect(getA.type).toBe(Type.find("() => { a: number }"));
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBeInstanceOf(ObjectType);
    expect(getA.type.returnType.properties.size).toBe(1);
    expect(getA.type.returnType.properties.get("a").type).toBe(Type.Number);
    expect(getA.type.returnType).toBe(Type.find("{ a: number }"));
    expect(a.type).toBe(getA.type.returnType);
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
    expect(getA.type).toBe(Type.find("() => A<number>"));
    expect(getA.type.argumentsTypes.length).toBe(0);
    expect(getA.type.returnType).toBeInstanceOf(ObjectType);
    expect(getA.type.returnType.properties.size).toBe(1);
    expect(getA.type.returnType.properties.get("a").type).toBe(Type.Number);
    expect(getA.type.returnType).toBe(Type.find("A<number>"));
    expect(a.type).toBe(getA.type.returnType);
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
    expect(a.type.subordinateType.returnType).toBe(Type.Undefined);
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
    expect(a.type).toBe(Type.find("() => undefined"));
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType).toBe(Type.Undefined);
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
    expect(a.type).toBe(Type.find("() => number"));
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType).toBe(Type.Number);
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
    expect(x.type).toBe(Type.String);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("() => string"));
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
    expect(a.type.subordinateType.returnType).toBe(
      a.type.subordinateType.argumentsTypes[0]
    );
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
    expect(a.type).toBe(Type.find("(number) => number"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.Number);
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
    expect(a.type).toBe(Type.find("(number) => () => number"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBeInstanceOf(FunctionType);
    expect(a.type.returnType).toBe(Type.find("() => number"));
    expect(a.type.returnType.argumentsTypes.length).toBe(0);
    expect(a.type.returnType.returnType).toBe(Type.Number);
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
    expect(mul.type.subordinateType.argumentsTypes[0].constraint).toBe(
      Type.find("bigint | number")
    );
    expect(
      mul.type.subordinateType.argumentsTypes[0].constraint.variants.length
    ).toBe(2);
    expect(
      mul.type.subordinateType.argumentsTypes[0].constraint.variants[0]
    ).toBe(Type.BigInt);
    expect(
      mul.type.subordinateType.argumentsTypes[0].constraint.variants[1]
    ).toBe(Type.Number);
    expect(mul.type.subordinateType.argumentsTypes[1]).toBeInstanceOf(TypeVar);
    expect(
      mul.type.subordinateType.argumentsTypes[1].constraint
    ).toBeInstanceOf(UnionType);
    expect(mul.type.subordinateType.argumentsTypes[1].constraint).toBe(
      Type.find("bigint | number")
    );
    expect(
      mul.type.subordinateType.argumentsTypes[1].constraint.variants.length
    ).toBe(2);
    expect(
      mul.type.subordinateType.argumentsTypes[1].constraint.variants[0]
    ).toBe(Type.BigInt);
    expect(
      mul.type.subordinateType.argumentsTypes[1].constraint.variants[1]
    ).toBe(Type.Number);
    expect(mul.type.subordinateType.returnType).toBeInstanceOf(TypeVar);
    expect(mul.type.subordinateType.returnType.constraint).toBeInstanceOf(
      UnionType
    );
    expect(mul.type.subordinateType.returnType.constraint).toBe(
      Type.find("bigint | number")
    );
    expect(mul.type.subordinateType.returnType.constraint.variants.length).toBe(
      2
    );
    expect(mul.type.subordinateType.returnType.constraint.variants[0]).toBe(
      Type.BigInt
    );
    expect(mul.type.subordinateType.returnType.constraint.variants[1]).toBe(
      Type.Number
    );
  });
  test("Inference global module function type by multiple arguments usage", async () => {
    const sourceAST = prepareAST(`
      const rol = (x, i) => (x << i) | (x >>> (32 - i));
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const rol = actual.body.get("rol");
    expect(errors.length).toBe(0);
    expect(rol.type).toBeInstanceOf(FunctionType);
    expect(rol.type).toBe(Type.find("(number, number) => number"));
    expect(rol.type.argumentsTypes.length).toBe(2);
    expect(rol.type.argumentsTypes[0]).toBe(Type.Number);
    expect(rol.type.argumentsTypes[1]).toBe(Type.Number);
    expect(rol.type.returnType).toBe(Type.Number);
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
    const aScope = actual.body.get("[[Scope2-6]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("(number) => number"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.Number);
    expect(aScope.body.get("b").type).toBe(Type.Number);
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
    const aScope = actual.body.get("[[Scope2-6]]");
    const fScope = actual.body.get("[[Scope3-18]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("(number) => number"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.Number);
    expect(aScope.body.get("f").type).toBe(Type.find("() => number"));
    expect(fScope.body.get("b").type).toBe(Type.Number);
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
    const aScope = actual.body.get("[[Scope2-6]]");
    const fScope = actual.body.get("[[Scope3-18]]");
    const f1Scope = actual.body.get("[[Scope4-21]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("(number) => string"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.String);
    expect(aScope.body.get("f").type).toBe(Type.find("() => string"));
    expect(fScope.body.get("f1").type).toBe(Type.find("() => undefined"));
    expect(f1Scope.body.get("f2").type).toBe(Type.find("() => number"));
  });
  test("Inference function local variable type", async () => {
    const sourceAST = prepareAST(`
      function a(x) {
        const b = 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const aScope = actual.body.get("[[Scope2-6]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(GenericType);
    expect(a.type.subordinateType.argumentsTypes.length).toBe(1);
    expect(a.type.subordinateType.returnType).toBe(Type.Undefined);
    expect(aScope.body.get("b").type).toBe(Type.find(2));
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
    const aScope = actual.body.get("[[Scope2-6]]");
    const fnScope = actual.body.get("[[Scope4-19]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("(number) => undefined"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.Undefined);
    expect(aScope.body.get("fn").type).toBeInstanceOf(FunctionType);
    expect(aScope.body.get("fn").type).toBe(Type.find("() => number"));
    expect(aScope.body.get("fn").type.argumentsTypes.length).toBe(0);
    expect(aScope.body.get("fn").type.returnType).toBe(Type.Number);
    expect(fnScope.body.get("c").type).toBe(Type.Number);
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
    expect(a.type.subordinateType.returnType).toBe(Type.Undefined);
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
    expect(a.type).toBe(Type.find("() => undefined"));
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType).toBe(Type.Undefined);
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
    expect(a.type).toBe(Type.find("() => number"));
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType).toBe(Type.Number);
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
    expect(x.type).toBe(Type.String);
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
    expect(a.type.subordinateType.returnType).toBe(
      a.type.subordinateType.argumentsTypes[0]
    );
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
    expect(a.type).toBe(Type.find("(number) => number"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.Number);
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
    expect(a.type).toBe(Type.find("(number) => () => number"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBeInstanceOf(FunctionType);
    expect(a.type.returnType).toBe(Type.find("() => number"));
    expect(a.type.returnType.argumentsTypes.length).toBe(0);
    expect(a.type.returnType.returnType).toBe(Type.Number);
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
    const aScope = actual.body.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("(number) => number"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.Number);
    expect(aScope.body.get("b").type).toBe(Type.Number);
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
    const aScope = actual.body.get("[[Scope2-16]]");
    const fScope = actual.body.get("[[Scope3-18]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("(number) => number"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.Number);
    expect(aScope.body.get("f").type).toBe(Type.find("() => number"));
    expect(fScope.body.get("b").type).toBe(Type.Number);
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
    const aScope = actual.body.get("[[Scope2-16]]");
    const fScope = actual.body.get("[[Scope3-18]]");
    const f1Scope = actual.body.get("[[Scope4-21]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("(number) => string"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.String);
    expect(aScope.body.get("f").type).toBe(Type.find("() => string"));
    expect(fScope.body.get("f1").type).toBe(Type.find("() => undefined"));
    expect(f1Scope.body.get("f2").type).toBe(Type.find("() => number"));
  });
  test("Inference function local variable type inside function expression", async () => {
    const sourceAST = prepareAST(`
      const a = function (x) {
        const b = 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const aScope = actual.body.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(GenericType);
    expect(a.type.subordinateType.argumentsTypes.length).toBe(1);
    expect(a.type.subordinateType.returnType).toBe(Type.Undefined);
    expect(aScope.body.get("b").type).toBe(Type.find(2));
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
    const aScope = actual.body.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("(number) => number"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.Number);
    expect(aScope.body.get("b").type).toBe(Type.Number);
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
    const aScope = actual.body.get("[[Scope2-16]]");
    const fnScope = actual.body.get("[[Scope4-19]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("(number) => undefined"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.Undefined);
    expect(aScope.body.get("fn").type).toBeInstanceOf(FunctionType);
    expect(aScope.body.get("fn").type).toBe(Type.find("() => number"));
    expect(aScope.body.get("fn").type.argumentsTypes.length).toBe(0);
    expect(aScope.body.get("fn").type.returnType).toBe(Type.Number);
    expect(fnScope.body.get("c").type).toBe(Type.Number);
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
    expect(a.type.subordinateType.returnType).toBe(Type.Undefined);
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
    expect(a.type).toBe(Type.find("() => undefined"));
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType).toBe(Type.Undefined);
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
    expect(a.type).toBe(Type.find("() => number"));
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType).toBe(Type.Number);
  });
  test("Inference global module function by single return 2 type inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = () => 2
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("() => number"));
    expect(a.type.argumentsTypes.length).toBe(0);
    expect(a.type.returnType).toBe(Type.Number);
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
    expect(x.type).toBe(Type.String);
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
    expect(x.type).toBe(Type.String);
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
    expect(a.type.subordinateType.returnType).toBe(
      a.type.subordinateType.argumentsTypes[0]
    );
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
    expect(a.type.subordinateType.returnType).toBe(
      a.type.subordinateType.argumentsTypes[0]
    );
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
    expect(a.type).toBe(Type.find("(number) => number"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.Number);
  });
  test("Inference global module function type by arguments usage 2 inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => x - 2
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("(number) => number"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.Number);
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
    expect(a.type).toBe(Type.find("(number) => () => number"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBeInstanceOf(FunctionType);
    expect(a.type.returnType).toBe(Type.find("() => number"));
    expect(a.type.returnType.argumentsTypes.length).toBe(0);
    expect(a.type.returnType.returnType).toBe(Type.Number);
  });
  test("Inference global module function type by inner function arguments usage 2 inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => () => x - 2;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("(number) => () => number"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBeInstanceOf(FunctionType);
    expect(a.type.returnType).toBe(Type.find("() => number"));
    expect(a.type.returnType.argumentsTypes.length).toBe(0);
    expect(a.type.returnType.returnType).toBe(Type.Number);
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
    const aScope = actual.body.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("(number) => number"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.Number);
    expect(aScope.body.get("b").type).toBe(Type.Number);
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
    const aScope = actual.body.get("[[Scope2-16]]");
    const fScope = actual.body.get("[[Scope3-18]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("(number) => number"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.Number);
    expect(aScope.body.get("f").type).toBe(Type.find("() => number"));
    expect(fScope.body.get("b").type).toBe(Type.Number);
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
    const aScope = actual.body.get("[[Scope2-16]]");
    const fScope = actual.body.get("[[Scope3-18]]");
    const f1Scope = actual.body.get("[[Scope4-21]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("(number) => string"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.String);
    expect(aScope.body.get("f").type).toBe(Type.find("() => string"));
    expect(fScope.body.get("f1").type).toBe(Type.find("() => undefined"));
    expect(f1Scope.body.get("f2").type).toBe(Type.find("() => number"));
  });
  test("Inference function local variable type inside arrow function", async () => {
    const sourceAST = prepareAST(`
      const a = x => {
        const b = 2;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const a = actual.body.get("a");
    const aScope = actual.body.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(GenericType);
    expect(a.type.subordinateType.argumentsTypes.length).toBe(1);
    expect(a.type.subordinateType.returnType).toBe(Type.Undefined);
    expect(aScope.body.get("b").type).toBe(Type.find(2));
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
    const aScope = actual.body.get("[[Scope2-16]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("(number) => number"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.Number);
    expect(aScope.body.get("b").type).toBe(Type.Number);
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
    const aScope = actual.body.get("[[Scope2-16]]");
    const fnScope = actual.body.get("[[Scope4-19]]");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(FunctionType);
    expect(a.type).toBe(Type.find("(number) => undefined"));
    expect(a.type.argumentsTypes.length).toBe(1);
    expect(a.type.argumentsTypes[0]).toBe(Type.Number);
    expect(a.type.returnType).toBe(Type.Undefined);
    expect(aScope.body.get("fn").type).toBeInstanceOf(FunctionType);
    expect(aScope.body.get("fn").type).toBe(Type.find("() => number"));
    expect(aScope.body.get("fn").type.argumentsTypes.length).toBe(0);
    expect(aScope.body.get("fn").type.returnType).toBe(Type.Number);
    expect(fnScope.body.get("c").type).toBe(Type.Number);
  });
  test("Inference function with default paramter and type", async () => {
    const sourceAST = prepareAST(`
      const fn = (a = 1) => a;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const fn = actual.body.get("fn");
    expect(errors.length).toBe(0);
    expect(fn.type).toBeInstanceOf(FunctionType);
    expect(fn.type).toBe(Type.find("(number | undefined) => number"));
    expect(fn.type.argumentsTypes.length).toBe(1);
    expect(fn.type.argumentsTypes[0]).toBeInstanceOf(UnionType);
    expect(fn.type.argumentsTypes[0].variants.length).toBe(2);
    expect(fn.type.argumentsTypes[0].variants[0]).toBe(Type.Number);
    expect(fn.type.argumentsTypes[0].variants[1]).toBe(Type.Undefined);
    expect(fn.type.argumentsTypes[0]).toBe(Type.find("number | undefined"));
    expect(fn.type.returnType).toBe(Type.Number);
  });
  test("Inference function with default paramter and type", async () => {
    const sourceAST = prepareAST(`
      const fn = (a: ?number = 1) => a;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const fn = actual.body.get("fn");
    expect(errors.length).toBe(0);
    expect(fn.type).toBeInstanceOf(FunctionType);
    expect(fn.type).toBe(
      Type.find("(number | undefined) => number | undefined")
    );
    expect(fn.type.argumentsTypes.length).toBe(1);
    expect(fn.type.argumentsTypes[0]).toBeInstanceOf(UnionType);
    expect(fn.type.argumentsTypes[0].variants.length).toBe(2);
    expect(fn.type.argumentsTypes[0].variants[0]).toBe(Type.Number);
    expect(fn.type.argumentsTypes[0].variants[1]).toBe(Type.Undefined);
    expect(fn.type.argumentsTypes[0]).toBe(Type.find("number | undefined"));
    expect(fn.type.returnType).toBe(fn.type.argumentsTypes[0]);
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
    expect(fn.type).toBe(Type.find("(number | undefined) => number"));
    expect(fn.type.argumentsTypes.length).toBe(1);
    expect(fn.type.argumentsTypes[0]).toBeInstanceOf(UnionType);
    expect(fn.type.argumentsTypes[0].variants.length).toBe(2);
    expect(fn.type.argumentsTypes[0].variants[0]).toBe(Type.Number);
    expect(fn.type.argumentsTypes[0].variants[1]).toBe(Type.Undefined);
    expect(fn.type.argumentsTypes[0]).toBe(Type.find("number | undefined"));
    expect(fn.type.returnType).toBe(Type.Number);
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
    expect(fn.type).toBe(Type.find("(number) => number"));
    expect(fn.type.argumentsTypes.length).toBe(1);
    expect(fn.type.argumentsTypes[0]).toBe(Type.Number);
    expect(fn.type.returnType).toBe(Type.Number);
    expect(res.type).toBeInstanceOf(FunctionType);
    expect(res.type).toBe(Type.find("(number, number) => number"));
    expect(res.type.argumentsTypes.length).toBe(2);
    expect(res.type.argumentsTypes[0]).toBe(Type.Number);
    expect(res.type.argumentsTypes[1]).toBe(Type.Number);
    expect(res.type.returnType).toBe(Type.Number);
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
    expect(g.type.subordinateType.argumentsTypes[0].argumentsTypes[0]).toBe(
      g.type.subordinateType.argumentsTypes[1]
    );
    expect(g.type.subordinateType.argumentsTypes[0].argumentsTypes[1]).toBe(
      g.type.subordinateType.argumentsTypes[2]
    );
    expect(g.type.subordinateType.argumentsTypes[0].returnType).toBe(
      g.type.subordinateType.returnType
    );
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
    expect(g.type.subordinateType.argumentsTypes[0].argumentsTypes[0]).toBe(
      g.type.subordinateType.argumentsTypes[1]
    );
    expect(g.type.subordinateType.argumentsTypes[0].argumentsTypes[1]).toBe(
      g.type.subordinateType.argumentsTypes[2]
    );
    expect(g.type.subordinateType.argumentsTypes[0].returnType).toBe(
      g.type.subordinateType.returnType
    );
    expect(g.type.subordinateType.argumentsTypes[1]).toBeInstanceOf(TypeVar);
    expect(g.type.subordinateType.argumentsTypes[2]).toBeInstanceOf(TypeVar);
    expect(g.type.subordinateType.returnType).toBe(Type.Number);
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
    expect(res.type.subordinateType.argumentsTypes[0].constraint).toBe(
      Type.find("bigint | number")
    );
    expect(
      res.type.subordinateType.argumentsTypes[0].constraint.variants.length
    ).toBe(2);
    expect(
      res.type.subordinateType.argumentsTypes[0].constraint.variants[0]
    ).toBe(Type.BigInt);
    expect(
      res.type.subordinateType.argumentsTypes[0].constraint.variants[1]
    ).toBe(Type.Number);
    expect(res.type.subordinateType.argumentsTypes[1]).toBeInstanceOf(TypeVar);
    expect(
      res.type.subordinateType.argumentsTypes[1].constraint
    ).toBeInstanceOf(UnionType);
    expect(res.type.subordinateType.argumentsTypes[1].constraint).toBe(
      Type.find("bigint | number")
    );
    expect(
      res.type.subordinateType.argumentsTypes[1].constraint.variants.length
    ).toBe(2);
    expect(
      res.type.subordinateType.argumentsTypes[1].constraint.variants[0]
    ).toBe(Type.BigInt);
    expect(
      res.type.subordinateType.argumentsTypes[1].constraint.variants[1]
    ).toBe(Type.Number);
    expect(res.type.subordinateType.returnType).toBeInstanceOf(TypeVar);
    expect(res.type.subordinateType.returnType.constraint).toBeInstanceOf(
      UnionType
    );
    expect(res.type.subordinateType.returnType.constraint).toBe(
      Type.find("bigint | number")
    );
    expect(res.type.subordinateType.returnType.constraint.variants.length).toBe(
      2
    );
    expect(res.type.subordinateType.returnType.constraint.variants[0]).toBe(
      Type.BigInt
    );
    expect(res.type.subordinateType.returnType.constraint.variants[1]).toBe(
      Type.Number
    );
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
    expect(a.type).toBe(
      Type.find(
        "{ 1: number, 2: bigint, 3: string, 4: boolean, 5: symbol, 6: null, 7: undefined, 8: RegExp }"
      )
    );
    expect(a.type.properties.get("1").type).toBe(Type.Number);
    expect(a.type.properties.get("2").type).toBe(Type.BigInt);
    expect(a.type.properties.get("3").type).toBe(Type.String);
    expect(a.type.properties.get("4").type).toBe(Type.Boolean);
    expect(a.type.properties.get("5").type).toBe(Type.Symbol);
    expect(a.type.properties.get("6").type).toBe(Type.Null);
    expect(a.type.properties.get("7").type).toBe(Type.Undefined);
    expect(a.type.properties.get("8").type).toBe(Type.find("RegExp"));
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
    expect(a.type).toBe(
      Type.find(
        "{ a: () => number, b: <a'>(a') => undefined, c: <a'>(a') => a' }"
      )
    );
    expect(a.type.properties.get("a").type).toBeInstanceOf(FunctionType);
    expect(a.type.properties.get("a").type).toBe(Type.find("() => number"));
    expect(a.type.properties.get("a").type.argumentsTypes.length).toBe(0);
    expect(a.type.properties.get("a").type.returnType).toBe(Type.Number);
    expect(a.type.properties.get("b").type).toBeInstanceOf(GenericType);
    expect(a.type.properties.get("b").type).toBe(
      Type.find("<a'>(a') => undefined")
    );
    expect(
      a.type.properties.get("b").type.subordinateType.argumentsTypes.length
    ).toBe(1);
    expect(
      a.type.properties.get("b").type.subordinateType.argumentsTypes[0]
    ).toBeInstanceOf(TypeVar);
    expect(a.type.properties.get("b").type.subordinateType.returnType).toBe(
      Type.Undefined
    );
    expect(a.type.properties.get("c").type).toBeInstanceOf(GenericType);
    expect(a.type.properties.get("c").type).toBe(Type.find("<a'>(a') => a'"));
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
    expect(a.type).toBe(Type.find("{ b: { c: () => number } }"));
    expect(a.type.properties.get("b").type).toBeInstanceOf(ObjectType);
    expect(a.type.properties.get("b").type.properties.size).toBe(1);
    expect(a.type.properties.get("b").type).toBe(
      Type.find("{ c: () => number }")
    );
    expect(
      a.type.properties.get("b").type.properties.get("c").type
    ).toBeInstanceOf(FunctionType);
    expect(a.type.properties.get("b").type.properties.get("c").type).toBe(
      Type.find("() => number")
    );
    expect(
      a.type.properties.get("b").type.properties.get("c").type.argumentsTypes
        .length
    ).toBe(0);
    expect(
      a.type.properties.get("b").type.properties.get("c").type.returnType
    ).toBe(Type.Number);
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
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const e = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(e.type).toBeInstanceOf(ObjectType);
    expect(e.type).toBe(Type.find("Error"));
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
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const e = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(e.type).toBeInstanceOf(ObjectType);
    expect(e.type).toBe(Type.find("SyntaxError"));
  });
  test("Inference simple throw with primitive type", async () => {
    const sourceAST = prepareAST(`
      try {
        throw 2;
      } catch(e) {}
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const e = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(e.type).toBe(Type.Number);
  });
  test("Inference simple throw with object type", async () => {
    const sourceAST = prepareAST(`
      try {
        throw { message: "test" };
      } catch(e) {}
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const e = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(e.type).toBeInstanceOf(ObjectType);
    expect(e.type.properties.size).toBe(1);
    expect(e.type).toBe(Type.find("{ message: string }"));
    expect(e.type.properties.get("message").type).toBe(Type.String);
  });
  test("Inference simple throw with anonymous function type", async () => {
    const sourceAST = prepareAST(`
      try {
        throw function() {};
      } catch(e) {}
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualCatchScope = actual.body.get("[[Scope4-17]]");
    const e = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(e.type).toBeInstanceOf(FunctionType);
    expect(e.type).toBe(Type.find("() => undefined"));
    expect(e.type.argumentsTypes.length).toBe(0);
    expect(e.type.returnType).toBe(Type.Undefined);
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
    const e = actualCatchScope.body.get("e");
    const a = actualCatchScope.body.get("a");
    expect(errors.length).toBe(0);
    expect(e.type).toBe(Type.Number);
    expect(a.type).toBe(e.type);
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
    const e = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(e.type).toBe(Type.Number);
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
    const e = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(e.type).toBe(Type.Number);
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
    const e = actualCatchScope.body.get("e");
    expect(errors.length).toBe(0);
    expect(e.type).toBe(Type.Number);
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
    expect(arr.type).toBe(Type.find("Array<number>"));
    expect(arr.type.keyType).toBe(Type.Number);
    expect(arr.type.valueType).toBe(Type.Number);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("number | undefined"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Number);
    expect(a.type.variants[1]).toBe(Type.Undefined);
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
    expect(errors[0].message).toEqual(
      'Property "0" are not exists in "Array<number>"'
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
    const actualScope = actual.body.get("[[Scope3-27]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("number | undefined"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Number);
    expect(a.type.variants[1]).toBe(Type.Undefined);
    expect(b.type).toBe(Type.Undefined);
  });
  test("Negative strict equals refinement for union variable(undefined and number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | undefined = 2;
      if (a !== undefined) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-27]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("number | undefined"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Number);
    expect(a.type.variants[1]).toBe(Type.Undefined);
    expect(b.type).toBe(Type.Number);
  });
  test("Strict equals refinement for union variable(null and number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | null = 2;
      if (a === null) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-22]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("null | number"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Null);
    expect(a.type.variants[1]).toBe(Type.Number);
    expect(b.type).toBe(Type.Null);
  });
  test("Negative strict equals refinement for union variable(null and number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | null = 2;
      if (a !== null) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-22]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("null | number"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Null);
    expect(a.type.variants[1]).toBe(Type.Number);
    expect(b.type).toBe(Type.Number);
  });
  test("Not strict equals refinement for union variable(undefined and number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | undefined = 2;
      if (a == null) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-21]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("number | undefined"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Number);
    expect(a.type.variants[1]).toBe(Type.Undefined);
    expect(b.type).toBe(Type.Undefined);
  });
  test("Negative not strict equals refinement for union variable(undefined and number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | undefined | null = 2;
      if (a != undefined) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-26]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("null | number | undefined"));
    expect(a.type.variants.length).toBe(3);
    expect(a.type.variants[0]).toBe(Type.Null);
    expect(a.type.variants[1]).toBe(Type.Number);
    expect(a.type.variants[2]).toBe(Type.Undefined);
    expect(b.type).toBe(Type.Number);
  });
  test("Not strict equals refinement for union variable(null and number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | null = 2;
      if (a == null) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-21]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("null | number"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Null);
    expect(a.type.variants[1]).toBe(Type.Number);
    expect(b.type).toBe(Type.Null);
  });
  test("Negative not strict equals refinement for union variable(null and number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | null | undefined = 2;
      if (a != null) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-21]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("null | number | undefined"));
    expect(a.type.variants.length).toBe(3);
    expect(a.type.variants[0]).toBe(Type.Null);
    expect(a.type.variants[1]).toBe(Type.Number);
    expect(a.type.variants[2]).toBe(Type.Undefined);
    expect(b.type).toBe(Type.Number);
  });
  test("Typeof refinement for union variable(number)", async () => {
    const sourceAST = prepareAST(`
      const a: number | string = 2;
      if (typeof a === "number") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-33]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("number | string"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Number);
    expect(a.type.variants[1]).toBe(Type.String);
    expect(b.type).toBe(Type.Number);
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("number | string"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Number);
    expect(a.type.variants[1]).toBe(Type.String);
    expect(b.type).toBe(Type.String);
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("boolean | number | string"));
    expect(a.type.variants.length).toBe(3);
    expect(a.type.variants[0]).toBe(Type.Boolean);
    expect(a.type.variants[1]).toBe(Type.Number);
    expect(a.type.variants[2]).toBe(Type.String);
    expect(b.type).toBe(Type.Boolean);
  });
  test("Typeof refinement for union variable(string)", async () => {
    const sourceAST = prepareAST(`
      const a: number | string = 2;
      if (typeof a === "string") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-33]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("number | string"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Number);
    expect(a.type.variants[1]).toBe(Type.String);
    expect(b.type).toBe(Type.String);
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("boolean | number"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Boolean);
    expect(a.type.variants[1]).toBe(Type.Number);
    expect(b.type).toBe(Type.Boolean);
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("2 | string"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find(2));
    expect(a.type.variants[1]).toBe(Type.String);
    expect(b.type).toBe(Type.find(2));
  });
  test("Equals refinement for union variable(number literal)", async () => {
    const sourceAST = prepareAST(`
      const a: 2 | string = 2;
      if (a === 2) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-19]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("2 | string"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find(2));
    expect(a.type.variants[1]).toBe(Type.String);
    expect(b.type).toBe(Type.find(2));
  });
  test("Equals refinement for union variable(number literal)", async () => {
    const sourceAST = prepareAST(`
      const a: number | string = 2;
      if (a === 2) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-19]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("number | string"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Number);
    expect(a.type.variants[1]).toBe(Type.String);
    expect(b.type).toBe(Type.find(2));
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("'2' | number"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find("'2'"));
    expect(a.type.variants[1]).toBe(Type.Number);
    expect(b.type).toBe(Type.find("'2'"));
  });
  test("Equals refinement for union variable(string literal)", async () => {
    const sourceAST = prepareAST(`
      const a: "2" | number = "2";
      if (a === "2") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-21]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("'2' | number"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find("'2'"));
    expect(a.type.variants[1]).toBe(Type.Number);
    expect(b.type).toBe(Type.find("'2'"));
  });
  test("Equals refinement for union variable(string literal)", async () => {
    const sourceAST = prepareAST(`
      const a: string | number = "2";
      if (a === "2") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-21]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("number | string"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Number);
    expect(a.type.variants[1]).toBe(Type.String);
    expect(b.type).toBe(Type.find("'2'"));
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("number | true"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Number);
    expect(a.type.variants[1]).toBe(Type.find(true));
    expect(b.type).toBe(Type.find(true));
  });
  test("Equals refinement for union variable(boolean literal)", async () => {
    const sourceAST = prepareAST(`
      const a: true | number = true;
      if (a === true) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-22]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("number | true"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Number);
    expect(a.type.variants[1]).toBe(Type.find(true));
    expect(b.type).toBe(Type.find(true));
  });
  test("Equals refinement for union variable(boolean literal)", async () => {
    const sourceAST = prepareAST(`
      const a: boolean | number = true;
      if (a === true) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-22]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("boolean | number"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Boolean);
    expect(a.type.variants[1]).toBe(Type.Number);
    expect(b.type).toBe(Type.find(true));
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("{ a: number } | number"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBeInstanceOf(ObjectType);
    expect(a.type.variants[0]).toBe(Type.find("{ a: number }"));
    expect(a.type.variants[1]).toBe(Type.Number);
    expect(b.type).toBe(Type.find("{ a: number }"));
  });
  test("Typeof refinement for union variable(null)", async () => {
    const sourceAST = prepareAST(`
      const a: number | null = 2;
      if (typeof a === "object") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-33]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("null | number"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Null);
    expect(a.type.variants[1]).toBe(Type.Number);
    expect(b.type).toBe(Type.Null);
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("(() => number) | number"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find("() => number"));
    expect(a.type.variants[1]).toBe(Type.Number);
    expect(b.type).toBe(Type.find("() => number"));
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("{ b: number, c: number } | { b: string }"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find("{ b: number, c: number }"));
    expect(a.type.variants[1]).toBe(Type.find("{ b: string }"));
    expect(b.type).toBe(Type.find("{ b: number, c: number }"));
  });
  test("Equals refinement for union property(number)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: string } | { b: 2, c: number } = { b: "2" };
      if (a.b === 2) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-21]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("{ b: 2, c: number } | { b: string }"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find("{ b: 2, c: number }"));
    expect(a.type.variants[1]).toBe(Type.find("{ b: string }"));
    expect(b.type).toBe(Type.find("{ b: 2, c: number }"));
  });
  test("Equals refinement for union property(number)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: string } | { b: number, c: number } = { b: "2" };
      if (a.b === 2) {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-21]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("{ b: number, c: number } | { b: string }"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find("{ b: number, c: number }"));
    expect(a.type.variants[1]).toBe(Type.find("{ b: string }"));
    expect(b.type).toBe(Type.find("{ b: 2, c: number }"));
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("{ b: number } | { b: string, c: number }"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find("{ b: number }"));
    expect(a.type.variants[1]).toBe(Type.find("{ b: string, c: number }"));
    expect(b.type).toBe(Type.find("{ b: string, c: number }"));
  });
  test("Equals refinement for union property(string)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: number } | { b: "2", c: number } = { b: 2 };
      if (a.b === "2") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-23]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("{ b: '2', c: number } | { b: number }"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find("{ b: '2', c: number }"));
    expect(a.type.variants[1]).toBe(Type.find("{ b: number }"));
    expect(b.type).toBe(Type.find("{ b: '2', c: number }"));
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("{ b: boolean, c: number } | { b: number }"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find("{ b: boolean, c: number }"));
    expect(a.type.variants[1]).toBe(Type.find("{ b: number }"));
    expect(b.type).toBe(Type.find("{ b: boolean, c: number }"));
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("{ b: 2, c: number } | { b: string }"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find("{ b: 2, c: number }"));
    expect(a.type.variants[1]).toBe(Type.find("{ b: string }"));
    expect(b.type).toBe(Type.find("{ b: 2, c: number }"));
  });
  test("Typeof refinement for union property(string literal)", async () => {
    const sourceAST = prepareAST(`
      const a: { b: number } | { b: "2", c: number } = { b: 2 };
      if (typeof a.b === "string") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-35]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("{ b: '2', c: number } | { b: number }"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find("{ b: '2', c: number }"));
    expect(a.type.variants[1]).toBe(Type.find("{ b: number }"));
    expect(b.type).toBe(Type.find("{ b: '2', c: number }"));
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("{ b: string } | { b: true, c: number }"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find("{ b: string }"));
    expect(a.type.variants[1]).toBe(Type.find("{ b: true, c: number }"));
    expect(b.type).toBe(Type.find("{ b: true, c: number }"));
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(
      Type.find("{ b: { d: number }, c: number } | { b: number }")
    );
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(
      Type.find("{ b: { d: number }, c: number }")
    );
    expect(a.type.variants[1]).toBe(Type.find("{ b: number }"));
    expect(b.type).toBe(Type.find("{ b: { d: number }, c: number }"));
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(
      Type.find("{ b: () => number, c: number } | { b: number }")
    );
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(
      Type.find("{ b: () => number, c: number }")
    );
    expect(a.type.variants[1]).toBe(Type.find("{ b: number }"));
    expect(b.type).toBe(Type.find("{ b: () => number, c: number }"));
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("boolean | number | string"));
    expect(a.type.variants.length).toBe(3);
    expect(a.type.variants[0]).toBe(Type.Boolean);
    expect(a.type.variants[1]).toBe(Type.Number);
    expect(a.type.variants[2]).toBe(Type.String);
    expect(b.type).toBe(Type.find("number | string"));
  });
  test("Multiple typeof refinement for property", async () => {
    const sourceAST = prepareAST(`
      const a: { a: string } | { a: number, b: string } | { a: number, b: number } = { a: 2, b: 2 };
      if (typeof a.a === "number" && typeof a.b === "number") {
        const b = a;
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const actualScope = actual.body.get("[[Scope3-62]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("{ a: number, b: number } | { a: number, b: string } | { a: string }"));
    expect(a.type.variants.length).toBe(3);
    expect(a.type.variants[0]).toBe(Type.find("{ a: number, b: number }"));
    expect(a.type.variants[1]).toBe(Type.find("{ a: number, b: string }"));
    expect(a.type.variants[2]).toBe(Type.find("{ a: string }"));
    expect(b.type).toBe(Type.find("{ a: number, b: number }"));
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
    const actualScope = actual.body.get("[[Scope5-7]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("number | string"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.Number);
    expect(a.type.variants[1]).toBe(Type.String);
    expect(b.type).toBe(Type.String);
  });
  // test("And operator inference", async () => {
  //   const sourceAST = prepareAST(`
  //     const a: number | null = 2;
  //     const b = a && a.toString();
  //   `);
  //   const [[actual], errors] = await createTypeGraph(
  //     [sourceAST],
  //     getModuleAST,
  //     false,
  //     mixTypeDefinitions()
  //   );
  //   const a = actual.body.get("a");
  //   const b = actual.body.get("b");
  //   expect(errors.length).toBe(0);
  //   expect(a.type).toBeInstanceOf(UnionType);
  //   expect(a.type).toBe(Type.find("null | number"));
  //   expect(a.type.variants.length).toBe(2);
  //   expect(a.type.variants[0]).toBe(Type.Null);
  //   expect(a.type.variants[1]).toBe(Type.Number);
  //   expect(a.type).toBeInstanceOf(UnionType);
  //   expect(a.type).toBe(Type.find("null | string"));
  //   expect(a.type.variants.length).toBe(2);
  //   expect(a.type.variants[0]).toBe(Type.Null);
  //   expect(a.type.variants[1]).toBe(Type.String);
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(
      Type.find("{ a: { b: number } } | { a: { b: string }, b: string }")
    );
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find("{ a: { b: number } }"));
    expect(a.type.variants[1]).toBe(
      Type.find("{ a: { b: string }, b: string }")
    );
    expect(b.type).toBe(Type.find("{ a: { b: number } }"));
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
    expect(errors[0]).toBeInstanceOf(HegelError);
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
      mixTypeDefinitions()
    );
    const actualScope = actual.body.get("[[Scope3-30]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("Array<number> | number"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find("Array<number>"));
    expect(a.type.variants[1]).toBe(Type.Number);
    expect(b.type).toBe(Type.find("Array<number>"));
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
    const actualScope = actual.body.get("[[Scope3-32]]");
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("{ b: Array<number> } | { b: number }"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find("{ b: Array<number> }"));
    expect(a.type.variants[1]).toBe(Type.find("{ b: number }"));
    expect(b.type).toBe(Type.find("{ b: Array<number> }"));
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(Type.find("{ a: number } | { b: string }"));
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find("{ a: number }"));
    expect(a.type.variants[1]).toBe(Type.find("{ b: string }"));
    expect(b.type).toBe(Type.find("{ a: number }"));
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBe(Type.find("{ a: { b: string } | { c: string } }"));
    expect(b.type).toBe(Type.find("{ a: { b: string } }"));
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
    const a = actual.body.get("a");
    const b = actualScope.body.get("b");
    expect(errors.length).toBe(0);
    expect(a.type).toBeInstanceOf(UnionType);
    expect(a.type).toBe(
      Type.find("{ a: { b: string } } | { a: { c: string } }")
    );
    expect(a.type.variants.length).toBe(2);
    expect(a.type.variants[0]).toBe(Type.find("{ a: { b: string } }"));
    expect(a.type.variants[1]).toBe(Type.find("{ a: { c: string } }"));
    expect(b.type).toBe(Type.find("{ a: { b: string } }"));
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
    expect(a.type).toBe(Type.find(2));
    expect(b.type).toBe(Type.find("'str'"));
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
    expect(a.type).toBe(Type.Number);
    expect(b.type).toBe(Type.String);
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
    expect(a).toBe(Type.find("Array<string>"));
    expect(a.keyType).toBe(Type.Number);
    expect(a.valueType).toBe(Type.String);
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
    expect(promisify).toBe(
      Type.find(
        "<Input, Output>((Input) => Output) => (Input) => Promise<Output>"
      )
    );
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
    expect(actualRes).toBe(Type.find("Promise<string>"));
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
    expect(res).toBe(Type.find("Array<number>"));
    expect(res.valueType).toBe(Type.Number);
    expect(lambda).toBeInstanceOf(FunctionType);
    expect(lambda).toBe(
      Type.find("(1 | 2 | 3, number, Array<1 | 2 | 3>) => number")
    );
    expect(lambda.argumentsTypes[0]).toBeInstanceOf(UnionType);
    expect(lambda.argumentsTypes[0]).toBe(Type.find("1 | 2 | 3"));
    expect(lambda.argumentsTypes[0].variants.length).toBe(3);
    expect(lambda.argumentsTypes[0].variants[0]).toBe(Type.find(1));
    expect(lambda.argumentsTypes[0].variants[1]).toBe(Type.find(2));
    expect(lambda.argumentsTypes[0].variants[2]).toBe(Type.find(3));
    expect(lambda.argumentsTypes[1]).toBe(Type.Number);
    expect(lambda.argumentsTypes[2]).toBeInstanceOf(CollectionType);
    expect(lambda.argumentsTypes[2]).toBe(Type.find("Array<1 | 2 | 3>"));
    expect(lambda.argumentsTypes[2].valueType).toBe(Type.find("1 | 2 | 3"));
    expect(lambda.argumentsTypes[2].valueType.variants.length).toBe(3);
    expect(lambda.argumentsTypes[2].valueType.variants[0]).toBe(Type.find(1));
    expect(lambda.argumentsTypes[2].valueType.variants[1]).toBe(Type.find(2));
    expect(lambda.argumentsTypes[2].valueType.variants[2]).toBe(Type.find(3));
    expect(lambda.returnType).toBe(Type.Number);
  });
});
