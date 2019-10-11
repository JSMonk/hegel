const HegelError = require("../build/utils/errors").default;
const createTypeGraph = require("../build/type-graph/type-graph").default;
const { Type } = require("../build/type-graph/types/type");
const { prepareAST } = require("./preparation");
const { ObjectType } = require("../build/type-graph/types/object-type");
const { GenericType } = require("../build/type-graph/types/generic-type");
const { FunctionType } = require("../build/type-graph/types/function-type");
const { CollectionType } = require("../build/type-graph/types/collection-type");
const { TYPE_SCOPE, CALLABLE } = require("../build/type-graph/constants");

describe("TypeScript type defitions", () => {
  describe("Simple defitions", () => {
    test("Define simple variable without error", async () => {
      const sourceAST = prepareAST(
        `
        declare var NaN: number; 
      `,
        true
      );
      const [[actual], errors] = await createTypeGraph(
        [sourceAST],
        () => {},
        true
      );
      expect(errors.length).toBe(0);
      expect(actual.body.get("NaN").type).toEqual(new Type("number"));
    });
    test("Define simple interface without error", async () => {
      const sourceAST = prepareAST(
        `
        declare var Two: 2; 
      `,
        true
      );
      const [[actual], errors] = await createTypeGraph(
        [sourceAST],
        () => {},
        true
      );
      const actualType = actual.body.get("Two").type;
      expect(errors.length).toBe(0);
      expect(actualType).toEqual(
        new Type(2, { isSubtypeOf: new Type("number") })
      );
    });
    test("Define simple function without error", async () => {
      const sourceAST = prepareAST(
        `
        declare function eval(x: string): any;
      `,
        true
      );
      const [[actual], errors] = await createTypeGraph(
        [sourceAST],
        () => {},
        true
      );
      const actualType = actual.body.get("eval").type;
      expect(errors.length).toBe(0);
      expect(actualType).toBeInstanceOf(FunctionType);
      expect(actualType.name).toBe("(string) => mixed");
    });
    test("Define simple interface without error", async () => {
      const sourceAST = prepareAST(
        `
        interface Symbol {
          toString(): string;
          test: number;
        }
      `,
        true
      );
      const [[actual], errors] = await createTypeGraph(
        [sourceAST],
        () => {},
        true
      );
      const typeScope = actual.body.get(TYPE_SCOPE);
      const actualType = typeScope.body.get("Symbol").type;
      expect(errors.length).toBe(0);
      expect(actualType).toBeInstanceOf(ObjectType);
      expect(actualType.name).toBe("Symbol");
    });
    test("Define simple callable interface without error", async () => {
      const sourceAST = prepareAST(
        `
        interface Date {};
        interface DateConstructor {
          (): Date;
          test: string;
        }
      `,
        true
      );
      const [[actual], errors] = await createTypeGraph(
        [sourceAST],
        () => {},
        true
      );
      const typeScope = actual.body.get(TYPE_SCOPE);
      const actualType = typeScope.body.get("DateConstructor").type;
      expect(errors.length).toBe(0);
      expect(actualType).toBeInstanceOf(FunctionType);
      expect(actualType.name).toBe("DateConstructor");
      expect(actualType.isSubtypeOf.properties.get("test").type.name).toBe(
        "string"
      );
    });
    test("Define simple indexable interface without error", async () => {
      const sourceAST = prepareAST(
        `
        interface Array<T> {
          [n: number]: T
          test: string;
        }
      `,
        true
      );
      const [[actual], errors] = await createTypeGraph(
        [sourceAST],
        () => {},
        true
      );
      const typeScope = actual.body.get(TYPE_SCOPE);
      const actualType = typeScope.body.get("Array").type;
      expect(errors.length).toBe(0);
      expect(actualType).toBeInstanceOf(GenericType);
      expect(actualType.subordinateType).toBeInstanceOf(CollectionType);
      expect(actualType.name).toBe("Array");
      expect(
        actualType.subordinateType.isSubtypeOf.properties.get("test").type.name
      ).toBe("string");
    });
  });
});
