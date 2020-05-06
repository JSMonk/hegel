const HegelError = require("../build/utils/errors").default;
const createTypeGraph = require("../build/type-graph/type-graph").default;
const { Type } = require("../build/type-graph/types/type");
const {
  prepareAST,
  mixTypeDefinitions,
  getModuleAST
} = require("./preparation");

describe("Variable declrataion and assignment", () => {
  test("Simple typed const declaration with number literal type", async () => {
    const sourceAST = prepareAST(`
      const a: 2 = 2; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(0);
  });
  test("Simple typed let declaration without value", async () => {
    const sourceAST = prepareAST(`
      let a: 2; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0]).toBeInstanceOf(HegelError);
    expect(errors[0].message).toBe(
      'Type "undefined" is incompatible with type "2"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 14, line: 2 },
      start: { column: 10, line: 2 }
    });
  });
  test("Simple typed const declaration with number literal type should throw error", async () => {
    const sourceAST = prepareAST(`
      const a: 2 = 4; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual('Type "4" is incompatible with type "2"');
    expect(errors[0].loc).toEqual({
      end: { column: 20, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with string literal type", async () => {
    const sourceAST = prepareAST(`
      const a: "" = ""; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(0);
  });
  test("Simple typed const declaration with string literal type should throw error", async () => {
    const sourceAST = prepareAST(`
      const a: "" = "test"; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      "Type \"'test'\" is incompatible with type \"''\""
    );
    expect(errors[0].loc).toEqual({
      start: { line: 2, column: 12 },
      end: { line: 2, column: 26 }
    });
  });
  test("Simple typed const declaration with boolean literal type", async () => {
    const sourceAST = prepareAST(`
      const a: true = true; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(0);
  });
  test("Simple typed const declaration with true literal type should throw error", async () => {
    const sourceAST = prepareAST(`
      const a: true = false; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "false" is incompatible with type "true"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 27, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with number type", async () => {
    const sourceAST = prepareAST(`
      const a: number = ""; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "\'\'" is incompatible with type "number"'
    );
    expect(errors[0].loc).toEqual({
      start: { line: 2, column: 12 },
      end: { line: 2, column: 26 }
    });
  });
  test("Simple typed const declaration with string type", async () => {
    const sourceAST = prepareAST(`
      const a: string = 2; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "2" is incompatible with type "string"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 25, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with boolean type", async () => {
    const sourceAST = prepareAST(`
      const a: boolean = 2; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "2" is incompatible with type "boolean"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 26, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with null type", async () => {
    const sourceAST = prepareAST(`
      const a: null = 2; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "2" is incompatible with type "null"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 23, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with undefined type", async () => {
    const sourceAST = prepareAST(`
      const a: undefined = 2; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "2" is incompatible with type "undefined"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 28, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with union type", async () => {
    const sourceAST = prepareAST(`
      const a: number | string = true; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "true" is incompatible with type "number | string"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 37, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with tuple type", async () => {
    const sourceAST = prepareAST(`
      const a: [number, string] = [2, 2]; 
    `);
    const [, errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "[2, 2]" is incompatible with type "[number, string]"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 40, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with tuple type without error", async () => {
    const sourceAST = prepareAST(`
      const a: [number, string] = [2, '2']; 
    `);
    const [, errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toEqual(0);
  });
  test("Simple class instance usage", async () => {
    const sourceAST = prepareAST(`
      class User {}

      const user: User = new User();
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(0);
  });
  test("Simple class instance usage with reference", async () => {
    const sourceAST = prepareAST(`
      class User {}

      const SameUser = User;

      const user: User = new SameUser();
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(0);
  });
  test("Simple typed const declaration with type alias", async () => {
    const sourceAST = prepareAST(`
      type A = number;
      const a: A = "2"; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "\'2\'" is incompatible with type "number"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 22, line: 3 },
      start: { column: 12, line: 3 }
    });
  });
  test("Simple typed const declaration with generic type alias", async () => {
    const sourceAST = prepareAST(`
      type A<T> = T;
      const a: A<number> = "2"; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "\'2\'" is incompatible with type "number"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 30, line: 3 },
      start: { column: 12, line: 3 }
    });
  });
  test("Simple typed const declaration with array type", async () => {
    const sourceAST = prepareAST(`
      const a: Array<number> = [2, "2"]; 
    `);
    const [, errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      `Type "[2, '2']" is incompatible with type "Array<number>"`
    );
    expect(errors[0].loc).toEqual({
      end: { column: 39, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with array type without error", async () => {
    const sourceAST = prepareAST(`
      const a: Array<number> = [2]; 
    `);
    const [, errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toEqual(0);
  });
  test("Simple typed const declaration with object type without required property", async () => {
    const sourceAST = prepareAST(`
      const a: { a: number } = {}; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
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
  test("Simple typed const declaration with object type without optional property", async () => {
    const sourceAST = prepareAST(`
      const a: { a: ?number } = {}; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(0);
  });
  test("Simple typed const declaration with object type with additional property", async () => {
    const sourceAST = prepareAST(`
      const a: { a: ?number } = { a: 2 }; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(0);
  });
  test("Simple typed const declaration with object type without property", async () => {
    const sourceAST = prepareAST(`
      const a: { a: ?number } = { b: 3 }; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
  });
  test("Simple typed const declaration with function type without argument", async () => {
    const sourceAST = prepareAST(`
      const a: () => undefined = (a: number) => {}; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "(number) => undefined" is incompatible with type "() => undefined"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 50, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed const declaration with function type with wrong argument", async () => {
    const sourceAST = prepareAST(`
      const a: number => undefined = (a: ?number) => 2; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "2" is incompatible with type "undefined"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 54, line: 2 },
      start: { column: 53, line: 2 }
    });
  });
  test("Simple typed const declaration with function type with wrong return", async () => {
    const sourceAST = prepareAST(`
      const a: number => undefined = (a: number) => a; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "number" is incompatible with type "undefined"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 53, line: 2 },
      start: { column: 52, line: 2 }
    });
  });
  test("Simple typed const declaration with function type with non-princiapl return by right", async () => {
    const sourceAST = prepareAST(`
      const a: number => ?number = (a: number) => a; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(0);
  });
  test("Simple typed const declaration with function type with non-princiapl return by left", async () => {
    const sourceAST = prepareAST(`
      const a: number => number = (a: number) => a == 2 ? a : undefined; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "2 | undefined" is incompatible with type "number"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 71, line: 2 },
      start: { column: 49, line: 2 }
    });
  });
  test("Simple typed const declaration with function type with non-princiapl return", async () => {
    const sourceAST = prepareAST(`
      const a: number => number = (a: number) => a; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(0);
  });
  test("Simple typed const declaration with function type with wrong argument", async () => {
    const sourceAST = prepareAST(`
      const a: ?number => undefined = (a: number) => 2; 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(2);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "2" is incompatible with type "undefined"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 54, line: 2 },
      start: { column: 53, line: 2 }
    });
    expect(errors[1].constructor).toEqual(HegelError);
    expect(errors[1].message).toEqual(
      'Type "(number) => undefined" is incompatible with type "(number | undefined) => undefined"'
    );
    expect(errors[1].loc).toEqual({
      end: { column: 54, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
  test("Simple typed function declaration with with wrong return", async () => {
    const sourceAST = prepareAST(`
      function fn(): number {
        return "2";
      }
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "\'2\'" is incompatible with type "number"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 19, line: 3 },
      start: { column: 8, line: 3 }
    });
  });
  test("Simple typed function declaration with with wrong object return", async () => {
    const sourceAST = prepareAST(`
      class User {}
      class Chat {}

      function fn(): Chat {
        return new User();
      }
    `);
    const [[actual], errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "User" is incompatible with type "Chat"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 26, line: 6 },
      start: { column: 8, line: 6 }
    });
  });
});

describe("Test calls meta for operatos and functions in globals scope", () => {
  test("Unary operator call with literal", async () => {
    const sourceAST = prepareAST(`
      !2;
    `);
    const [[actual], , globals] = await createTypeGraph([sourceAST]);
    const actualCall = actual.calls[0];
    const expectedCall = expect.objectContaining({
      target: globals.body.get("!"),
      arguments: [new Type(2, { isSubtypeOf: new Type("number") })]
    });
    expect(actualCall).toEqual(expectedCall);
  });
  test("Unary operator call with variable", async () => {
    const sourceAST = prepareAST(`
      const a:number = 2;
      !a;
    `);
    const [[actual], , globals] = await createTypeGraph([sourceAST]);
    const actualCall = actual.calls[1];
    const expectedCall = expect.objectContaining({
      target: globals.body.get("!"),
      arguments: [actual.body.get("a")]
    });
    expect(actualCall).toEqual(expectedCall);
  });
  test("Double unary operator call", async () => {
    const sourceAST = prepareAST(`
      !!2;
    `);
    const [[actual], , globals] = await createTypeGraph([sourceAST]);
    const firstActualCall = actual.calls[0];
    const secondActualCall = actual.calls[1];
    const firstExpectedCall = expect.objectContaining({
      target: globals.body.get("!"),
      arguments: [new Type(2, { isSubtypeOf: new Type("number") })]
    });
    const secondExpectedCall = expect.objectContaining({
      target: globals.body.get("!"),
      arguments: [Type.Boolean]
    });
    expect(firstActualCall).toEqual(firstExpectedCall);
    expect(secondActualCall).toEqual(secondExpectedCall);
  });
  test("Binary operator call with literal", async () => {
    const sourceAST = prepareAST(`
      2 - 2;
    `);
    const [[actual], , globals] = await createTypeGraph([sourceAST]);
    const actualCall = actual.calls[0];
    const expectedCall = expect.objectContaining({
      target: globals.body.get("b-"),
      arguments: [
        new Type(2, { isSubtypeOf: new Type("number") }),
        new Type(2, { isSubtypeOf: new Type("number") })
      ]
    });
    expect(actualCall).toEqual(expectedCall);
  });
  test("Binary operator call with variable", async () => {
    const sourceAST = prepareAST(`
      const a:number = 2;
      a - 2;
    `);
    const [[actual], , globals] = await createTypeGraph([sourceAST]);
    const actualCall = actual.calls[1];
    const expectedCall = expect.objectContaining({
      target: globals.body.get("b-"),
      arguments: [
        actual.body.get("a"),
        new Type(2, { isSubtypeOf: new Type("number") })
      ]
    });
    expect(actualCall).toEqual(expectedCall);
  });
  test("Double binary operator call", async () => {
    const sourceAST = prepareAST(`
      2 - 2 - 2;
    `);
    const [[actual], , globals] = await createTypeGraph([sourceAST]);
    const firstActualCall = actual.calls[0];
    const secondActualCall = actual.calls[1];
    const firstExpectedCall = expect.objectContaining({
      target: globals.body.get("b-"),
      arguments: [
        new Type(2, { isSubtypeOf: new Type("number") }),
        new Type(2, { isSubtypeOf: new Type("number") })
      ]
    });
    const secondExpectedCall = expect.objectContaining({
      target: globals.body.get("b-"),
      arguments: [
        new Type("number"),
        new Type(2, { isSubtypeOf: new Type("number") })
      ]
    });
    expect(firstActualCall).toEqual(firstExpectedCall);
    expect(secondActualCall).toEqual(secondExpectedCall);
  });
  test("Call function with wrong count of arguments", async () => {
    const sourceAST = prepareAST(`
       function fn(a: number) {}
       fn();
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual("1 arguments are required. Given 0.");
    expect(errors[0].loc).toEqual({
      end: { column: 11, line: 3 },
      start: { column: 7, line: 3 }
    });
  });
  test("Call function with right count of arguments", async () => {
    const sourceAST = prepareAST(`
       function fn(a: ?number) {}
       fn();
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(0);
  });
  test("Function declaration with signed argument will throw error", async () => {
    const sourceAST = prepareAST(`
       function fn(a?: number) {}
       fn();
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      "The optional argument syntax is not allowed. Use optional type instead."
    );
    expect(errors[0].loc).toEqual({
      end: { column: 29, line: 2 },
      start: { column: 19, line: 2 }
    });
  });
  test("Call function with different type", async () => {
    const sourceAST = prepareAST(`
       function fn(a: number) {}
       fn("string");
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "\'string\'" is incompatible with type "number"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 18, line: 3 },
      start: { column: 10, line: 3 }
    });
  });
  test("Call function which return a value like a side effect function", async () => {
    const sourceAST = prepareAST(`
      function fn() {
        return 1;
      }

      fn()
    `);

    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'You use function "fn" as side effect function, but it returns a number type'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 10, line: 6 },
      start: { column: 6, line: 6 }
    });
  });
  test("Function without return", async () => {
    const sourceAST = prepareAST(`
       function fn(a: number): number {}
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Function should return something with type "number"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 40, line: 2 },
      start: { column: 7, line: 2 }
    });
  });
  test("Function with worng return type", async () => {
    const sourceAST = prepareAST(`
       function fn(a: number): string { return 2 }
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "2" is incompatible with type "string"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 48, line: 2 },
      start: { column: 40, line: 2 }
    });
  });
  test("Function with right return type", async () => {
    const sourceAST = prepareAST(`
       function fn(a: number): number { return 2 }
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(0);
  });
  test("Call if statement with non-boolean type", async () => {
    const sourceAST = prepareAST(`
       if(2) {

       } 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "2" is incompatible with type "boolean"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 8, line: 4 },
      start: { column: 7, line: 2 }
    });
  });
  test("Call while statement with non-boolean type", async () => {
    const sourceAST = prepareAST(`
       while(2) {

       } 
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "2" is incompatible with type "boolean"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 8, line: 4 },
      start: { column: 7, line: 2 }
    });
  });
  test("Call do-while statement with non-boolean type", async () => {
    const sourceAST = prepareAST(`
       do {
       } while(2);
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "2" is incompatible with type "boolean"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 18, line: 3 },
      start: { column: 7, line: 2 }
    });
  });
  test("Call for statement with non-boolean type", async () => {
    const sourceAST = prepareAST(`
       for(let i = 5; i--;);
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "number" is incompatible with type "boolean | undefined"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 28, line: 2 },
      start: { column: 7, line: 2 }
    });
  });
  test("Call ternary expression with non-boolean type", async () => {
    const sourceAST = prepareAST(`
       2 ? true : false;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "2" is incompatible with type "boolean"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 23, line: 2 },
      start: { column: 7, line: 2 }
    });
  });
});

describe("Object and collection properties", () => {
  test("Get undefined property in object", async () => {
    const sourceAST = prepareAST(`
       const a = { a: 1 };
       a.b;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Property "b" does not exist in "{ a: number }"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 10, line: 3 },
      start: { column: 7, line: 3 }
    });
  });
  test("Get existed property in object", async () => {
    const sourceAST = prepareAST(`
       const a = { a: 1 };
       a.a;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toEqual(0);
  });
  test("Get undefined property in nested object", async () => {
    const sourceAST = prepareAST(`
       const a = { a: { b: 2 } };
       a.a.c;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors[0].message).toEqual(
      'Property "c" does not exist in "{ b: number }"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 12, line: 3 },
      start: { column: 7, line: 3 }
    });
  });
  test("Object with literal type should finish without error", async () => {
    const sourceAST = prepareAST(`
      const a: { a: true } = { a: true };
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
  });
  test("Get property from Union type when both types has property", async () => {
    const sourceAST = prepareAST(`
      type A = { a: number };
      type B = { a: string };
      const c: A | B = { a : 2 };
      c.a;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
  });
  test("Get property from Union type when second type has not property", async () => {
    const sourceAST = prepareAST(`
      type A = { b: string };
      type B = { a: number };
      const c: A | B = { a : 2 };
      c.a;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(1);
    expect(errors[0].message).toEqual(
      'Property "a" does not exist in "{ a: number } | { b: string }"'
    );
  });
  test("Get property from Union type when first type has not property", async () => {
    const sourceAST = prepareAST(`
      type A = { b: string };
      type B = { a: number };
      const c: B | A = { a : 2 };
      c.a;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(1);
    expect(errors[0].message).toEqual(
      'Property "a" does not exist in "{ a: number } | { b: string }"'
    );
  });
});
describe("Callable types", () => {
  test("Call non-function variable", async () => {
    const sourceAST = prepareAST(`
      let a = 2;
      a();
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual('The type "number" is not callable.');
    expect(errors[0].loc).toEqual({
      end: { column: 9, line: 3 },
      start: { column: 6, line: 3 }
    });
  });
  test("Call non-function property", async () => {
    const sourceAST = prepareAST(`
      const a = { b: 2 };
      a.b();
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual('The type "number" is not callable.');
    expect(errors[0].loc).toEqual({
      end: { column: 11, line: 3 },
      start: { column: 6, line: 3 }
    });
  });
});
describe("Checking objects and collections reference behavior", () => {
  test("Object reference behavior", async () => {
    const sourceAST = prepareAST(`
      type A = { a: number | string };
      type B = { a: number };
      const b: B = { a: 2 };
      const a: A = b;
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "{ a: number }" is incompatible with type "{ a: number | string }"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 20, line: 5 },
      start: { column: 12, line: 5 }
    });
  });
  test("Object reference behavior with literal", async () => {
    const sourceAST = prepareAST(`
      type A = { a: number | string };
      const a: A = { a: 2 };
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
  });
  test("Collection reference behavior", async () => {
    const sourceAST = prepareAST(`
      type A = Array<number | string>;
      type B = Array<number>;
      const b: B = [2];
      const a: A = b;
    `);
    const [, errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toBe(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "Array<number>" is incompatible with type "Array<number | string>"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 20, line: 5 },
      start: { column: 12, line: 5 }
    });
  });
  test("Collection reference behavior with literal", async () => {
    const sourceAST = prepareAST(`
      type A = Array<number | string>;
      const a: A = [2];
    `);
    const [, errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toBe(0);
  });
});
describe("Nullable types", () => {
  test("Nullable type without value without error", async () => {
    const sourceAST = prepareAST(`
      const a: { a: ?string } = {};
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
  });
  test("Nullable type with value without error", async () => {
    const sourceAST = prepareAST(`
      const a: { a: ?string } = { a: "test" };
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(0);
  });
  test("Nullable type with value with error", async () => {
    const sourceAST = prepareAST(`
      const a: { a: ?string } = { a: 2 };
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "{ a: 2 }" is incompatible with type "{ a: string | undefined }"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 40, line: 2 },
      start: { column: 12, line: 2 }
    });
  });
});

describe("Generics", () => {
  test("Generic type with restriction", async () => {
    const sourceAST = prepareAST(`
      type A<T: 2 | 3> = { a: T };
      const a: A<1> = { a: 1 };
    `);
    const [, errors] = await createTypeGraph([sourceAST]);
    expect(errors.length).toBe(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Parameter "1" is incompatible with restriction "2 | 3"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 19, line: 3 },
      start: { column: 15, line: 3 }
    });
  });
});

describe("Rest parameter typing", () => {
  test("Full rest param", async () => {
    const sourceAST = prepareAST(`
      function a(...args: Array<string>) {}
      a("1", "2", "3");
    `);
    const [, errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toBe(0);
  });
  test("Empty rest param", async () => {
    const sourceAST = prepareAST(`
      function a(...args: Array<string>) {}
      a();
    `);
    const [, errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toBe(0);
  });
  test("Wrong rest param", async () => {
    const sourceAST = prepareAST(`
      function a(...args: Array<string>) {}
      a(2);
    `);
    const [, errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toBe(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "[2]" is incompatible with type "...Array<string>"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 10, line: 3 },
      start: { column: 6, line: 3 }
    });
  });
  test("Required and full rest param", async () => {
    const sourceAST = prepareAST(`
      function a(a: string, ...args: Array<string>) {}
      a("sas", "1", "2", "3");
    `);
    const [, errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toBe(0);
  });
  test("Required and empty rest param", async () => {
    const sourceAST = prepareAST(`
      function a(a: string, ...args: Array<string>) {}
      a("sas");
    `);
    const [, errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toBe(0);
  });
  test("Empty required and empty rest param", async () => {
    const sourceAST = prepareAST(`
      function a(a: string, ...args: Array<string>) {}
      a();
    `);
    const [, errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toBe(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual("1 arguments are required. Given 0.");
    expect(errors[0].loc).toEqual({
      end: { column: 9, line: 3 },
      start: { column: 6, line: 3 }
    });
  });
  test("Issue #74: Function should not be compared with contravariance usage", async () => {
    const sourceAST = prepareAST(`
      function foo(obj: { a : number | string }) {
        obj.a = 'foo';
      }

      const f: ({ a: number }) => undefined = foo;  
    `);
    const [, errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toBe(1);
    expect(errors[0].constructor).toEqual(HegelError);
    expect(errors[0].message).toEqual(
      'Type "({ a: number | string }) => undefined" is incompatible with type "({ a: number }) => undefined"'
    );
    expect(errors[0].loc).toEqual({
      end: { column: 49, line: 6 },
      start: { column: 12, line: 6 }
    });
  });
  test("Issue #74: Function should be compared with covariance usage of property", async () => {
    const sourceAST = prepareAST(`
      function foo(obj: { a: $Immutable<number | string> }) {}

      const f: ({ a: number }) => undefined = foo;  
    `);
    const [, errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toBe(0);
  });
  test("Issue #74: Function should be compared with covariance usage of whole object", async () => {
    const sourceAST = prepareAST(`
      function foo(obj: $Immutable<{ a: number | string }>) {}

      const f: ({ a: number }) => undefined = foo;  
    `);
    const [, errors] = await createTypeGraph(
      [sourceAST],
      getModuleAST,
      false,
      mixTypeDefinitions()
    );
    expect(errors.length).toBe(0);
  });
});
