const createTypeGraph = require("../build/type-graph/type-graph").default;
const { Type } = require("../build/type-graph/types/type");
const { UnionType } = require("../build/type-graph/types/union-type");
const { ObjectType } = require("../build/type-graph/types/object-type");
const { TYPE_SCOPE } = require("../build/type-graph/constants");
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
    const typeScope = actual.body.get(TYPE_SCOPE);
    expect(errors.length).toEqual(0);
    expect(typeScope.body.get("A").type).toEqual(new Type("number"));
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
      await mixTypeDefinitions(createTypeGraph)
    );
    const typeScope = actual.body.get(TYPE_SCOPE);
    expect(errors.length).toEqual(0);
    expect(typeScope.body.get("B").type).toEqual(
      new UnionType("number | undefined", [
        new Type("number"),
        new Type("undefined", { isSubtypeOf: new Type("void") })
      ])
    );
  });
  test("Should throw error with non-object property", async () => {
    const sourceAST = prepareAST(`
      type A = $PropertyType<number, "a">;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual(
      'Property "a" are not exists in "number"'
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
    const typeScope = actual.body.get(TYPE_SCOPE);
    expect(errors.length).toEqual(0);
    expect(typeScope.body.get("A").type).toEqual(
      new UnionType("'a' | 'b' | 'c'", [
        new Type("'a'", { isSubtypeOf: new Type("string") }),
        new Type("'b'", { isSubtypeOf: new Type("string") }),
        new Type("'c'", { isSubtypeOf: new Type("string") })
      ])
    );
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
    const typeScope = actual.body.get(TYPE_SCOPE);
    expect(errors.length).toEqual(0);
    expect(typeScope.body.get("A").type).toEqual(
      new UnionType("number | string", [new Type("number"), new Type("string")])
    );
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
    const typeScope = actual.body.get(TYPE_SCOPE);
    expect(errors.length).toEqual(0);
    const type = typeScope.body.get("A").type;
    expect(type.name).toEqual(
      "{ a: 1 | undefined, b: 2 | undefined, c: 3 | undefined }"
    );
    expect([...type.properties.values()].map(a => a.type)).toEqual([
      new UnionType("1 | undefined", [
        new Type(1, { isSubtypeOf: new Type("number") }),
        new Type("undefined")
      ]),
      new UnionType("2 | undefined", [
        new Type(2, { isSubtypeOf: new Type("number") }),
        new Type("undefined")
      ]),
      new UnionType("3 | undefined", [
        new Type(3, { isSubtypeOf: new Type("number") }),
        new Type("undefined")
      ])
    ]);
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
    const typeScope = actual.body.get(TYPE_SCOPE);
    expect(errors.length).toEqual(0);
    const type = typeScope.body.get("A").type;
    expect(type.name).toEqual("{ a: 1, b: 2 }");
    expect([...type.properties.values()].map(a => a.type)).toEqual([
      new Type(1, { isSubtypeOf: new Type("number") }),
      new Type(2, { isSubtypeOf: new Type("number") })
    ]);
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
      await mixTypeDefinitions(createTypeGraph)
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
    const typeScope = actual.body.get(TYPE_SCOPE);
    expect(errors.length).toEqual(0);
    const type = typeScope.body.get("A").type;
    expect(type.name).toEqual("{ c: 3 }");
    expect([...type.properties.values()].map(a => a.type)).toEqual([
      new Type(3, { isSubtypeOf: new Type("number") })
    ]);
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
      await mixTypeDefinitions(createTypeGraph)
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
    const typeScope = actual.body.get(TYPE_SCOPE);
    expect(errors.length).toEqual(0);
    expect(typeScope.body.get("A").type).toEqual(new Type("number"));
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
      const a = 2;
      type A = $TypeOf<a>;
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const typeScope = actual.body.get(TYPE_SCOPE);
    expect(errors.length).toEqual(0);
    expect(typeScope.body.get("A").type).toEqual(new Type("number"));
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
