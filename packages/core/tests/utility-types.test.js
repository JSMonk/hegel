const prepareAST = require("./preparation");
const createTypeGraph = require("../build/type-graph/type-graph").default;
const { Type } = require("../build/type-graph/types/type");
const { UnionType } = require("../build/type-graph/types/union-type");
const { ObjectType } = require("../build/type-graph/types/object-type");
const { TYPE_SCOPE } = require("../build/type-graph/constants");

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
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    const typeScope = actual.body.get(TYPE_SCOPE);
    expect(errors.length).toEqual(0);
    expect(typeScope.body.get("B").type).toEqual(
      new UnionType("number | void", [new Type("number"), new Type("void")])
    );
  });
  test("Should throw error with non-object property", async () => {
    const sourceAST = prepareAST(`
      type A = $PropertyType<number, "a">;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual(
      "First parameter should be an object or collection"
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
