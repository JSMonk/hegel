const prepareAST = require("./preparation");
const createTypeGraph = require("../build/type/type-graph").default;
const HegelError = require("../build/utils/errors").default;
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

describe("Variable declrataion and assignment", () => {
  test("Simple typed const declaration with number type", () => {
    const sourceAST = prepareAST(`
      const a: number = ""; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "string" is incompatible with type "number"'
    );
    expect(errors[0].loc).toEqual({
      start: { line: 2, column: 12 },
      end: { line: 2, column: 26 }
    });
  });
  test("Simple typed const declaration with string type", () => {
    const sourceAST = prepareAST(`
      const a: string = 2; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "number" is incompatible with type "string"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 25, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with boolean type", () => {
    const sourceAST = prepareAST(`
      const a: boolean = 2; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "number" is incompatible with type "boolean"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 26, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with null type", () => {
    const sourceAST = prepareAST(`
      const a: null = 2; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "number" is incompatible with type "null"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 23, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with undefined type", () => {
    const sourceAST = prepareAST(`
      const a: undefined = 2; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "number" is incompatible with type "undefined"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 28, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with union type", () => {
    const sourceAST = prepareAST(`
      const a: number | string = true; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "boolean" is incompatible with type "number | string"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 37, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with tuple type", () => {
    const sourceAST = prepareAST(`
      const a: [number, string] = [2, 2]; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "[number, number]" is incompatible with type "[number, string]"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 40, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with tuple type without error", () => {
    const sourceAST = prepareAST(`
      const a: [number, string] = [2, '2']; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(0);
  });
  test("Simple typed const declaration with type alias", () => {
    const sourceAST = prepareAST(`
      type A = number;
      const a: A = "2"; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "string" is incompatible with type "A"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 22, line: 3 },
      start: { column: 12, line: 3 }
    });
  });
  test("Simple typed const declaration with generic type alias", () => {
    const sourceAST = prepareAST(`
      type A<T> = T;
      const a: A<number> = "2"; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "string" is incompatible with type "number"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 30, line: 3 },
      start: { column: 12, line: 3 }
    });
  });
  test("Simple typed const declaration with array type", () => {
    const sourceAST = prepareAST(`
      const a: Array<number> = [2, "2"]; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "[number, string]" is incompatible with type "{ [key: number]: number }"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 39, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with array type without error", () => {
    const sourceAST = prepareAST(`
      const a: Array<number> = [2]; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(0);
  });
  test("Simple typed const declaration with object type without required property", () => {
    const sourceAST = prepareAST(`
      const a: { a: number } = {}; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "{  }" is incompatible with type "{ a: number }"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 33, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with object type without optional property", () => {
    const sourceAST = prepareAST(`
      const a: { a: ?number } = {}; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(0);
  });
  test("Simple typed const declaration with object type with additional property", () => {
    const sourceAST = prepareAST(`
      const a: { a: ?number } = { a: 2 }; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(0);
  });
  test("Simple typed const declaration with object type without property", () => {
    const sourceAST = prepareAST(`
      const a: { a: ?number } = { b: 3 }; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(0);
  });
  test("Simple typed const declaration with function type without argument", () => {
    const sourceAST = prepareAST(`
      const a: number => void = () => {}; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "() => void" is incompatible with type "(number) => void"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 40, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with function type with wrong argument", () => {
    const sourceAST = prepareAST(`
      const a: number => void = (a: ?number) => 2; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "(number | void) => number" is incompatible with type "(number) => void"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 49, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with function type with wrong return", () => {
    const sourceAST = prepareAST(`
      const a: number => void = (a: number) => a; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "(number) => number" is incompatible with type "(number) => void"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 48, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with function type with non-princiapl return by right", () => {
    const sourceAST = prepareAST(`
      const a: number => ?number = (a: number) => a; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(0);
  });
  test("Simple typed const declaration with function type with non-princiapl return by left", () => {
    const sourceAST = prepareAST(`
      const a: number => number = (a: number) => a == 2 ? a : undefined; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "(number) => number | undefined" is incompatible with type "(number) => number"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 71, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with function type with non-princiapl return", () => {
    const sourceAST = prepareAST(`
      const a: number => number = (a: number) => a; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(0);
  });
  test("Simple typed const declaration with function type with wrong argument", () => {
    const sourceAST = prepareAST(`
      const a: ?number => void = (a: number) => 2; 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "(number) => number" is incompatible with type "(number | void) => void"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 49, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
});

describe("Test calls meta for operatos and functions in global scope", () => {
  test("Unary operator call with literal", () => {
    const sourceAST = prepareAST(`
      !2;
    `);
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
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
    const [actual] = createTypeGraph(sourceAST);
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
  test("Call function with wrong count of arguments", () => {
    const sourceAST = prepareAST(`
       function fn(a: number) {}
       fn();
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual("1 arguments are required. Given 0.");
    expect(errors[0].loc).toEqual({
      end: { column: 11, line: 3 },
      start: { column: 7, line: 3 }
    });
  });
  test("Call function with right count of arguments", () => {
    const sourceAST = prepareAST(`
       function fn(a: ?number) {}
       fn();
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(0);
  });
  test("Function declaration with signed argument will throw error", () => {
    const sourceAST = prepareAST(`
       function fn(a?: number) {}
       fn();
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      "The optional argument syntax is not allowed. Please use maybe type syntax."
    );
    expect(errors[0].loc).toEqual({
      end: { column: 29, line: 2 },
      identifierName: "a",
      start: { column: 19, line: 2 }
    });
  });
  test("Call function with different type", () => {
    const sourceAST = prepareAST(`
       function fn(a: number) {}
       fn("string");
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "string" is incompatible with type "number"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 19, line: 3 },
      start: { column: 7, line: 3 }
    });
  });
  test("Call if statement with non-boolean type", () => {
    const sourceAST = prepareAST(`
       if(2) {

       } 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "number" is incompatible with type "boolean"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 8, line: 4 },
      start: { column: 7, line: 2 }
    });
  });
  test("Call while statement with non-boolean type", () => {
    const sourceAST = prepareAST(`
       while(2) {

       } 
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "number" is incompatible with type "boolean"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 8, line: 4 },
      start: { column: 7, line: 2 }
    });
  });
  test("Call do-while statement with non-boolean type", () => {
    const sourceAST = prepareAST(`
       do {
       } while(2);
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "number" is incompatible with type "boolean"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 18, line: 3 },
      start: { column: 7, line: 2 }
    });
  });
  test("Call for statement with non-boolean type", () => {
    const sourceAST = prepareAST(`
       for(let i = 5; i--;);
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "number" is incompatible with type "boolean"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 28, line: 2 },
      start: { column: 7, line: 2 }
    });
  });
  test("Call ternary expression with non-boolean type", () => {
    const sourceAST = prepareAST(`
       2 ? true : false;
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "number" is incompatible with type "boolean"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 23, line: 2 },
      start: { column: 7, line: 2 }
    });
  });
});

describe("Object and collection properties", () => {
  test("Get undefined property in object", () => {
    const sourceAST = prepareAST(`
       const a = { a: 1 };
       a.b;
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Property "b" are not exists in "{ a: number }"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 10, line: 3 },
      start: { column: 7, line: 3 }
    });
  });
  test("Get existed property in object", () => {
    const sourceAST = prepareAST(`
       const a = { a: 1 };
       a.a;
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors.length).toEqual(0);
  });
  test("Get undefined property in nested object", () => {
    const sourceAST = prepareAST(`
       const a = { a: { b: 2 } };
       a.a.c;
    `);
    const [, errors] = createTypeGraph(sourceAST);
    expect(errors[0].message).toEqual(
      'Property "c" are not exists in "{ b: number }"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 12, line: 3 },
      start: { column: 7, line: 3 }
    });
  });
});
