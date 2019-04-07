// @flow
import NODE from "../utils/nodes";
import HegelError from "../utils/errors";
import { Type } from "../type-graph/types/type";
import { Scope } from "../type-graph/scope";
import { ModuleScope } from "../type-graph/module-scope";
import { ObjectType } from "../type-graph/types/object-type";
import { findVariableInfo } from "../utils/common";
import { inferenceTupleType } from "./tuple-type";
import { inferenceObjectType } from "./object-type";
import { inferenceFunctionLiteralType } from "./function-type";
import type { Node } from "@babel/parser";

export function inferenceTypeForNode(
  currentNode: Node,
  typeScope: Scope,
  parentNode: Scope | ModuleScope,
  typeGraph: ModuleScope
): Type {
  switch (currentNode.type) {
    case NODE.NUMERIC_LITERAL:
      return Type.createTypeWithName(currentNode.value, typeScope, {
        isSubtypeOf: Type.createTypeWithName("number", typeScope)
      });
    case NODE.STRING_LITERAL:
      return Type.createTypeWithName(currentNode.value, typeScope, {
        isSubtypeOf: Type.createTypeWithName("string", typeScope)
      });
    case NODE.BOOLEAN_LITERAL:
      return Type.createTypeWithName(currentNode.value, typeScope, {
        isSubtypeOf: Type.createTypeWithName("boolean", typeScope)
      });
    case NODE.NULL_LITERAL:
      return Type.createTypeWithName(null, typeScope, {
        isSubtypeOf: Type.createTypeWithName("void", typeScope)
      });
    case NODE.REG_EXP_LITERAL:
      return ObjectType.createTypeWithName("RegExp", typeScope);
    case NODE.IDENTIFIER:
      const variableInfo = findVariableInfo(currentNode, parentNode);
      return variableInfo.type;
    case NODE.ARRAY_EXPRESSION:
      return inferenceTupleType(currentNode, typeScope, parentNode, typeGraph);
    case NODE.OBJECT_EXPRESSION:
      return inferenceObjectType(currentNode, typeScope, parentNode, typeGraph);
    case NODE.OBJECT_METHOD:
    case NODE.FUNCTION_DECLARATION:
    case NODE.FUNCTION_EXPRESSION:
    case NODE.ARROW_FUNCTION_EXPRESSION:
      return inferenceFunctionLiteralType(currentNode, typeScope, parentNode);
  }
  throw new Error(currentNode.type);
}
