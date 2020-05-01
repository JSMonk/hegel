const createTypeGraph = require("../build/type-graph/type-graph").default;
const { Type } = require("../build/type-graph/types/type");
const { ObjectType } = require("../build/type-graph/types/object-type");
const {
  prepareAST,
  getModuleAST,
  mixTypeDefinitions
} = require("./preparation");

describe("Test $PropertyType", () => {
  test("Simple test of object property", async () => {
    const sourceAST = prepareAST(`
      type Obj = { a: number };
      type A = $PropertyType<Obj, "a">;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const typeScope = actual.typeScope;
    expect(errors.length).toEqual(0);
    expect(typeScope.body.get("A") === Type.Number).toBe(true);
  });
  test("Simple test of array property", async () => {
    const sourceAST = prepareAST(`
      type A = Array<number>;
      type B = $PropertyType<A, 0>;
    `);
    const [[actual], errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    const typeScope = actual.typeScope;
    expect(errors.length).toEqual(0);
    expect(typeScope.body.get("B") === Type.find("number | undefined")).toBe(
      true
    );
  });
  test("Should throw error with non-object property", async () => {
    const sourceAST = prepareAST(`
      type A = $PropertyType<number, "a">;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual(
      'Property "a" does not exist in "number"'
    );
  });
  test("Should throw error with non-literal property", async () => {
    const sourceAST = prepareAST(`
      type A = $PropertyType<{ a: number }, string>;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual("Second parameter should be an literal");
  });
});

describe("Test $Keys", () => {
  test("Simple test of object keys", async () => {
    const sourceAST = prepareAST(`
      type Obj = { a: 1, b: 2, c: 3 };
      type A = $Keys<Obj>;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const typeScope = actual.typeScope;
    expect(errors.length).toEqual(0);
    expect(typeScope.body.get("A") === Type.find("'a' | 'b' | 'c'")).toBe(true);
  });
  test("Should throw error with non-object target", async () => {
    const sourceAST = prepareAST(`
      type A = $Keys<2>;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual(
      "First parameter should be an object or collection type"
    );
  });
});

describe("Test $Values", () => {
  test("Simple test of object keys", async () => {
    const sourceAST = prepareAST(`
      type Obj = { a: number, b: string, c: string };
      type A = $Values<Obj>;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const typeScope = actual.typeScope;
    expect(errors.length).toEqual(0);
    expect(typeScope.body.get("A") === Type.find("number | string")).toBe(true);
  });
  test("Should throw error with non-object target", async () => {
    const sourceAST = prepareAST(`
      type A = $Values<2>;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual(
      "First parameter should be an object or collection type"
    );
  });
});

describe("Test $Partial", () => {
  test("Simple test of object keys", async () => {
    const sourceAST = prepareAST(`
      type Obj = { a: 1, b: 2, c: 3 };
      type A = $Partial<Obj>;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const typeScope = actual.typeScope;
    expect(errors.length).toEqual(0);
    expect(typeScope.body.get("A")).toBe(
      Type.find("{ a: 1 | undefined, b: 2 | undefined, c: 3 | undefined }")
    );
  });
  test("Should throw error with non-object target", async () => {
    const sourceAST = prepareAST(`
      type A = $Partial<2>;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual(
      "First parameter should be an object type"
    );
  });
});

describe("Test $Pick", () => {
  test("Simple test of object keys", async () => {
    const sourceAST = prepareAST(`
      type Obj = { a: 1, b: 2, c: 3 };
      type A = $Pick<Obj, "a" | "b">;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const typeScope = actual.typeScope;
    expect(errors.length).toEqual(0);
    expect(typeScope.body.get("A") === Type.find("{ a: 1, b: 2 }")).toBe(true);
  });
  test("Should throw error with non-object first argument", async () => {
    const sourceAST = prepareAST(`
      type A = $Pick<2, "a" | "b">;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual(
      "First parameter should be an object type"
    );
  });
  test("Should throw error with non-string literal second argument", async () => {
    const sourceAST = prepareAST(`
      type A = $Pick<{ a: 1 }, "a" | 2 | Array<number>>;
    `);
    const [, errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual(
      "The second parameter should be an string literals type"
    );
  });
});

describe("Test $Omit", () => {
  test("Simple test of object keys", async () => {
    const sourceAST = prepareAST(`
      type Obj = { a: 1, b: 2, c: 3 };
      type A = $Omit<Obj, "a" | "b">;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const typeScope = actual.typeScope;
    expect(errors.length).toEqual(0);
    expect(typeScope.body.get("A") === Type.find("{ c: 3 }")).toBe(true);
  });
  test("Should throw error with non-object first argument", async () => {
    const sourceAST = prepareAST(`
      type A = $Omit<2, "a" | "b">;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual(
      "First parameter should be an object type"
    );
  });
  test("Should throw error with non-string literal second argument", async () => {
    const sourceAST = prepareAST(`
      type A = $Omit<{ a: 2 }, "a" | 2 | Array<number>>;
    `);
    const [, errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual(
      "The second parameter should be an string literals type"
    );
  });
});

describe("Test $ReturnType", () => {
  test("Simple test of object keys", async () => {
    const sourceAST = prepareAST(`
      type Fn = () => number;
      type A = $ReturnType<Fn>;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const typeScope = actual.typeScope;
    expect(errors.length).toEqual(0);
    expect(typeScope.body.get("A") === Type.Number).toBe(true);
  });
  test("Should throw error with non-object first argument", async () => {
    const sourceAST = prepareAST(`
      type A = $ReturnType<2>;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual(
      "First parameter should be an function type"
    );
  });
});

describe("Test $TypeOf", () => {
  test("Simple test of type of", async () => {
    const sourceAST = prepareAST(`
      let a = 2;
      type A = $TypeOf<a>;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const typeScope = actual.typeScope;
    expect(errors.length).toEqual(0);
    expect(typeScope.body.get("A") === Type.Number).toBe(true);
  });
  test("Should throw error with non-runtime first argument", async () => {
    const sourceAST = prepareAST(`
      type A = $TypeOf<a>;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual('Variable "a" is not defined!');
  });
});

describe("Test $InstanceOf", () => {
  test("Simple test of instance of", async () => {
    const sourceAST = prepareAST(`
      class User { name: string = "" }
      type A = $InstanceOf<$TypeOf<User>>;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const typeScope = actual.typeScope;
    expect(errors.length).toEqual(0);
    const type = typeScope.body.get("A");
    expect(type).toBeInstanceOf(ObjectType);
    expect(type === Type.find("User", { parent: actual.typeScope })).toBe(true);
  });
  test("Should throw error with non-class first argument", async () => {
    const sourceAST = prepareAST(`
      type A = $InstanceOf<{}>;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual(
      "Cannot apply $InstanceOf to non-class type"
    );
  });
});
describe("Issues", () => {
  test("Issue #135: Soft object type should stay soft object after $Partial", async () => {
    const sourceAST = prepareAST(`
      type StillSoft = $Partial<{ test: number, ... }>;
    `);
    const [[module], errors] = await createTypeGraph([sourceAST]);
    const StillSoft = module.typeScope.body.get("StillSoft");
    expect(errors.length).toEqual(0);
    expect(StillSoft).toBeInstanceOf(ObjectType);
    expect(StillSoft.isStrict).toBe(false);
    expect(StillSoft.isNominal).toBe(false);
    expect(
      StillSoft.properties.get("test").type === Type.term("number | undefined")
    ).toBe(true);
    expect(StillSoft === Type.term("{ test: number | undefined, ... }")).toBe(
      true
    );
  });
  test("Issue #135: Strict object type should stay strict object after $Partial", async () => {
    const sourceAST = prepareAST(`
      type StillStrict = $Partial<{ test: number }>;
    `);
    const [[module], errors] = await createTypeGraph([sourceAST]);
    const StillStrict = module.typeScope.body.get("StillStrict");
    expect(errors.length).toEqual(0);
    expect(StillStrict).toBeInstanceOf(ObjectType);
    expect(StillStrict.isStrict).toBe(true);
    expect(StillStrict.isNominal).toBe(false);
    expect(
      StillStrict.properties.get("test").type ===
        Type.term("number | undefined")
    ).toBe(true);
    expect(StillStrict === Type.term("{ test: number | undefined }")).toBe(
      true
    );
  });
});
