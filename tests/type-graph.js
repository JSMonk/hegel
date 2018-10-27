const babylon = require("@babel/parser");
const createTypeGraph = require("../build/type/type-graph").default;
const { Type } = require("../build/type/types");

const babelrc = {
  sourceType: "module",
  plugins: ["flow"]
};

const prepeareAST = source => babylon.parse(source, babelrc).program;

const getEntries = map => [...map.entries()];

describe("Simple global variable nodes", () => {
  test("Creating global module variable with number type", () => {
    const sourceAST = prepeareAST(`
      const a: number = 2;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("number"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with string type", () => {
    const sourceAST = prepeareAST(`
      const a: string = '2';
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("string"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with boolean type", () => {
    const sourceAST = prepeareAST(`
      const a: boolean = false;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("boolean"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with void type", () => {
    const sourceAST = prepeareAST(`
      const a: void = undefined;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("void"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with any type", () => {
    const sourceAST = prepeareAST(`
      const a: any = 2;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("any"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with mixed type", () => {
    const sourceAST = prepeareAST(`
      const a: mixed = 2;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("mixed"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with literal null type", () => {
    const sourceAST = prepeareAST(`
      const a: null = null;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("null", true),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with literal number type", () => {
    const sourceAST = prepeareAST(`
      const a: 2 = 2;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type(2, true),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with literal string type", () => {
    const sourceAST = prepeareAST(`
      const a: '2' = '2';
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("2", true),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with literal boolean type", () => {
    const sourceAST = prepeareAST(`
      const a: false = false;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type(false, true),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
  test("Creating global module variable with literal undefined type", () => {
    const sourceAST = prepeareAST(`
      const a: undefined = undefined;
    `);
    const actual = createTypeGraph(sourceAST);
    const expected = expect.objectContaining({
      type: new Type("undefined"),
      parent: actual
    });
    expect(actual.body.get("a")).toEqual(expected);
  });
});

describe("Block scoped variables", () => {
  test("Global and block scopes", () => {
    const sourceAST = prepeareAST(`
      const a: number = 1;
      {
        const a: string = '2';
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualScope = actual.body.get("[[Scope3-6]]");
    const expectedScope = expect.objectContaining({
      type: "block",
      parent: actual
    });
    const expectedVaraible = expect.objectContaining({
      type: new Type("number"),
      parent: actual
    });
    const expectedScopedVariable = expect.objectContaining({
      type: new Type("string"),
      parent: actualScope
    });
    expect(actual.body.get("a")).toEqual(expectedVaraible);
    expect(actualScope).toEqual(expectedScope);
    expect(actualScope.body.get("a")).toEqual(expectedScopedVariable);
  });
  test("Nested not global block scopes", () => {
    const sourceAST = prepeareAST(`
      {
        const a: number = 1;
        {
          const a: string = '2';
        }
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualTopScope = actual.body.get("[[Scope2-6]]");
    const actualBottomScope = actual.body.get("[[Scope4-8]]");
    const expectedTopScope = expect.objectContaining({
      type: "block",
      parent: actual
    });
    const expectedTopScopedVaraible = expect.objectContaining({
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
    expect(actualTopScope.body.get("a")).toEqual(expectedTopScopedVaraible);
    expect(actualBottomScope).toEqual(expectedBottomScope);
    expect(actualBottomScope.body.get("a")).toEqual(
      expectedBottomScopedVariable
    );
  });
  test("Sibling scopes", () => {
    const sourceAST = prepeareAST(`
      {
        const a: number = 1;
      }
      {
        const a: string = '2';
      }
    `);
    const actual = createTypeGraph(sourceAST);
    const actualTopScope = actual.body.get("[[Scope2-6]]");
    const actualBottomScope = actual.body.get("[[Scope5-6]]");
    const expectedTopScope = expect.objectContaining({
      type: "block",
      parent: actual
    });
    const expectedTopScopedVaraible = expect.objectContaining({
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
    expect(actualTopScope.body.get("a")).toEqual(expectedTopScopedVaraible);
    expect(actualBottomScope).toEqual(expectedBottomScope);
    expect(actualBottomScope.body.get("a")).toEqual(
      expectedBottomScopedVariable
    );
  });
});

describe("Operators scopes", () => {
  test("If operator scope", () => {
    const sourceAST = prepeareAST(`
      if (true) {
        const a: number = 2;
      }
    `);
    const actual = createTypeGraph(sourceAST);
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
    const sourceAST = prepeareAST(`
      while (true) {
        const a: number = 2;
      }
    `);
    const actual = createTypeGraph(sourceAST);
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
    const sourceAST = prepeareAST(`
      for (;;) {
        const a: number = 2;
      }
    `);
    const actual = createTypeGraph(sourceAST);
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
    const sourceAST = prepeareAST(`
      do {
        const a: number = 2;
      } while(true)
    `);
    const actual = createTypeGraph(sourceAST);
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
