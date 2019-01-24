import { Type, FunctionType, VariableInfo, ModuleScope } from "../type/types";
import GteDeclaration from "./generics/gte";
import AwaitDeclaration from "./generics/await";
import LogicDeclaration from "./generics/logic";
import EqualsDeclaration from "./generics/equals";
import TernaryDeclaration from "./generics/ternary";
import AssignmentDeclaration from "./generics/assign";

const operatorModuleScope = new ModuleScope();

const mixBaseOperators = typeScope => {
  if (!operatorModuleScope.body.size) {
    const operators = new Map([
      [
        "+",
        FunctionType.createTypeWithName(
          "(mixed) => number",
          typeScope,
          [Type.createTypeWithName("mixed", typeScope)],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "-",
        FunctionType.createTypeWithName(
          "(mixed) => number",
          typeScope,
          [Type.createTypeWithName("mixed", typeScope)],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "!",
        FunctionType.createTypeWithName(
          "(mixed) => boolean",
          typeScope,
          [Type.createTypeWithName("mixed", typeScope)],
          Type.createTypeWithName("boolean", typeScope)
        )
      ],
      [
        "~",
        FunctionType.createTypeWithName(
          "(number) => number",
          typeScope,
          [Type.createTypeWithName("number", typeScope)],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "typeof",
        FunctionType.createTypeWithName(
          "(mixed) => string",
          typeScope,
          [Type.createTypeWithName("mixed", typeScope)],
          Type.createTypeWithName("string", typeScope)
        )
      ],
      [
        "void",
        FunctionType.createTypeWithName(
          "(mixed) => undefined",
          typeScope,
          [Type.createTypeWithName("mixed", typeScope)],
          Type.createTypeWithName("string", typeScope)
        )
      ],
      [
        "delete",
        FunctionType.createTypeWithName(
          "(mixed) => undefined",
          typeScope,
          [Type.createTypeWithName("mixed", typeScope)],
          Type.createTypeWithName("undefined", typeScope)
        )
      ],
      [
        "await",
        GenericType.createTypeWithName(
          "<T>(Promise<T>) => <T>",
          typeScope,
          AwaitDeclaration.typeParameters.params,
          typeScope,
          AwaitDeclaration
        )
      ],
      [
        "==",
        GenericType.createTypeWithName(
          "<T>(T, T) => boolean",
          typeScope,
          EqualsDeclaration.typeParameters.params,
          typeScope,
          EqualsDeclaration
        )
      ],
      [
        "===",
        GenericType.createTypeWithName(
          "<T>(T, T) => boolean",
          typeScope,
          EqualsDeclaration.typeParameters.params,
          typeScope,
          EqualsDeclaration
        )
      ],
      [
        "!==",
        GenericType.createTypeWithName(
          "<T>(T, T) => boolean",
          typeScope,
          EqualsDeclaration.typeParameters.params,
          typeScope,
          EqualsDeclaration
        )
      ],
      [
        "!=",
        GenericType.createTypeWithName(
          "<T>(T, T) => boolean",
          typeScope,
          EqualsDeclaration.typeParameters.params,
          typeScope,
          EqualsDeclaration
        )
      ],
      [
        ">=",
        GenericType.createTypeWithName(
          "<T>(T, T) => boolean",
          typeScope,
          GteDeclaraction.typeParameters.params,
          typeScope,
          GteDeclaraction
        )
      ],
      [
        "<=",
        GenericType.createTypeWithName(
          "<T>(T, T) => boolean",
          typeScope,
          GteDeclaraction.typeParameters.params,
          typeScope,
          GteDeclaraction
        )
      ],
      [
        ">",
        GenericType.createTypeWithName(
          "<T>(T, T) => boolean",
          typeScope,
          GteDeclaraction.typeParameters.params,
          typeScope,
          GteDeclaraction
        )
      ],
      [
        "<",
        GenericType.createTypeWithName(
          "<T>(T, T) => boolean",
          typeScope,
          GteDeclaraction.typeParameters.params,
          typeScope,
          GteDeclaraction
        )
      ],
      [
        "+<number>",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "+<string>",
        FunctionType.createTypeWithName(
          "(string, string) => string",
          typeScope,
          [
            Type.createTypeWithName("string", typeScope),
            Type.createTypeWithName("string", typeScope)
          ],
          Type.createTypeWithName("string", typeScope)
        )
      ],
      [
        "-",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "/",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "%",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "|",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "&",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "^",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "**",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "<<",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        ">>",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        ">>>",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "in",
        FunctionType.createTypeWithName(
          "(string, Object) => boolean",
          typeScope,
          [
            Type.createTypeWithName("string", typeScope),
            Type.createTypeWithName("Object", typeScope)
          ],
          Type.createTypeWithName("boolean", typeScope)
        )
      ],
      [
        "instanceof",
        FunctionType.createTypeWithName(
          "(mixed, mixed) => boolean",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "=",
        GenericType.createTypeWithName(
          "<T>(T, T) => boolean",
          typeScope,
          AssignmentDeclaration.typeParameters.params,
          typeScope,
          AssignmentDeclaration
        )
      ],
      [
        "+=<string>",
        FunctionType.createTypeWithName(
          "(string, string) => string",
          typeScope,
          [
            Type.createTypeWithName("string", typeScope),
            Type.createTypeWithName("string", typeScope)
          ],
          Type.createTypeWithName("string", typeScope)
        )
      ],
      [
        "+=<number>",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "-=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "*=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "/=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "%=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "**=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        ">>=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        ">>>=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "<<=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "|=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "&=",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      // Updates
      [
        "++",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        "--",
        FunctionType.createTypeWithName(
          "(number, number) => number",
          typeScope,
          [
            Type.createTypeWithName("number", typeScope),
            Type.createTypeWithName("number", typeScope)
          ],
          Type.createTypeWithName("number", typeScope)
        )
      ],
      [
        // Logical
        "&&",
        GenericType.createTypeWithName(
          "<A, B>(A, B) => A | B",
          typeScope,
          LogicDeclaration.typeParameters.params,
          typeScope,
          LogicDeclaration
        )
      ],
      [
        "||",
        GenericType.createTypeWithName(
          "<A, B>(A, B) => A | B",
          typeScope,
          LogicDeclaration.typeParameters.params,
          typeScope,
          LogicDeclaration
        )
      ],
      [
        "?:",
        GenericType.createTypeWithName(
          "<A, B>(A, B) => A | B",
          typeScope,
          TernaryDeclaration.typeParameters.params,
          typeScope,
          TernaryDeclaration
        )
      ]
    ]);
    operatorModuleScope.body = operators;
  }
  typeScope.body = new Map([...typeScope.body, ...operatorModuleScope.body]);
  return operatorModuleScope;
};

export default mixBaseOperators;
