const prepareAST = require("./preparation");
const createTypeGraph = require("../build/type/type-graph").default;
const {
  Type,
  ObjectType,
  FunctionType,
  UnionType,
  VariableInfo,
  AliasInfo,
  UNDEFINED_TYPE,
  TYPE_SCOPE
} = require("../build/type/types");

describe("Test calls meta for operatos and functions in global scope", () => {
  test("Unary operator call with literal", () => {
    const sourceAST = prepareAST(`
      !2;
    `);
    const actual = createTypeGraph(sourceAST);
    const actualCall = actual.calls[0];
    const expectedCall = expect.objectContaining({
      target: actual.body.get("!"),
      arguments: [new Type("number")]
    }); 
    expect(actualCall).toEqual(expectedCall);
  });
  test("Unary operator call with variable", () => {
    const sourceAST = prepareAST(`
      const a:number = 2;
      !a;
    `);
    const actual = createTypeGraph(sourceAST);
    const actualCall = actual.calls[1];
    const expectedCall = expect.objectContaining({
      target: actual.body.get("!"),
      arguments: [actual.body.get("a")]
    }); 
    expect(actualCall).toEqual(expectedCall);
  });
  test("Double unary operator call", () => {
    const sourceAST = prepareAST(`
      !!2;
    `);
    const actual = createTypeGraph(sourceAST);
    const firstActualCall = actual.calls[0];
    const secondActualCall = actual.calls[1];
    const firstExpectedCall = expect.objectContaining({
      target: actual.body.get("!"),
      arguments: [new Type("number")]
    }); 
    const secondExpectedCall = expect.objectContaining({
      target: actual.body.get("!"),
      arguments: [new Type("boolean")]
    }); 
    expect(firstActualCall).toEqual(firstExpectedCall);
    expect(secondActualCall).toEqual(secondExpectedCall);
  });
  test("Binary operator call with literal", () => {
    const sourceAST = prepareAST(`
      2 - 2;
    `);
    const actual = createTypeGraph(sourceAST);
    const actualCall = actual.calls[0];
    const expectedCall = expect.objectContaining({
      target: actual.body.get("-"),
      arguments: [new Type("number"), new Type("number")]
    }); 
    expect(actualCall).toEqual(expectedCall);
  });
  test("Binary operator call with variable", () => {
    const sourceAST = prepareAST(`
      const a:number = 2;
      a - 2;
    `);
    const actual = createTypeGraph(sourceAST);
    const actualCall = actual.calls[1];
    const expectedCall = expect.objectContaining({
      target: actual.body.get("-"),
      arguments: [actual.body.get("a"), new Type("number")]
    }); 
    expect(actualCall).toEqual(expectedCall);
  });
  test("Double binary operator call", () => {
    const sourceAST = prepareAST(`
      2 - 2 - 2;
    `);
    const actual = createTypeGraph(sourceAST);
    const firstActualCall = actual.calls[0];
    const secondActualCall = actual.calls[1];
    const firstExpectedCall = expect.objectContaining({
      target: actual.body.get("-"),
      arguments: [new Type("number"), new Type("number")]
    }); 
    const secondExpectedCall = expect.objectContaining({
      target: actual.body.get("-"),
      arguments: [new Type("number"), new Type("number")]
    }); 
    expect(firstActualCall).toEqual(firstExpectedCall);
    expect(secondActualCall).toEqual(secondExpectedCall);
  });
});
