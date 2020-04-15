const createTypeGraph = require("../build/type-graph/type-graph").default;
const { Type } = require("../build/type-graph/types/type");
const { prepareAST } = require("./preparation");
const { ObjectType } = require("../build/type-graph/types/object-type");
const { GenericType } = require("../build/type-graph/types/generic-type");
const { FunctionType } = require("../build/type-graph/types/function-type");
const { CollectionType } = require("../build/type-graph/types/collection-type");

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
      expect(actual.body.get("NaN").type === Type.Number).toBe(true);
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
      expect(actualType === Type.find(2)).toBe(true);
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
      expect(actualType.name).toBe("(string) => unknown");
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
      const typeScope = actual.typeScope;
      const actualType = typeScope.body.get("Symbol");
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
      const typeScope = actual.typeScope;
      const actualType = typeScope.body.get("DateConstructor");
      expect(errors.length).toBe(0);
      expect(actualType).toBeInstanceOf(ObjectType);
      expect(actualType.name).toBe("DateConstructor");
      expect(actualType.properties.get("test").type === Type.String).toBe(true);
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
      const typeScope = actual.typeScope;
      const actualType = typeScope.body.get("Array");
      expect(errors.length).toBe(0);
      expect(actualType).toBeInstanceOf(GenericType);
      expect(actualType.subordinateType).toBeInstanceOf(CollectionType);
      expect(actualType.name).toBe("Array");
      expect(
        actualType.subordinateType.isSubtypeOf.properties.get("test").type === Type.String
      ).toBe(true);
    });
  });
});
describe("Issues", () => {
    test("Issue #80: Type guards should have boolean return type", async () => {
      const sourceAST = prepareAST(
        `declare function isNumber(x: any): x is number`,
        true
      );
      const [[actual], errors] = await createTypeGraph(
        [sourceAST],
        () => {},
        true
      );
      const isNumber = actual.body.get("isNumber");
      expect(errors.length).toBe(0);
      expect(isNumber.type).toBeInstanceOf(FunctionType);
      expect(isNumber.type === Type.find("(unknown) => boolean")).toBe(true);
      expect(isNumber.type.argumentsTypes.length).toBe(1);
      expect(isNumber.type.argumentsTypes[0] === Type.Unknown).toBe(true);
      expect(isNumber.type.returnType === Type.Boolean).toBe(true);
    });
  
});
