// @flow
import NODE from "../utils/nodes";
import { Type } from "../type-graph/types/type";
import { TypeScope } from "../type-graph/type-scope";
import { THIS_TYPE } from "../type-graph/constants";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import { VariableScope } from "../type-graph/variable-scope";
import { $AppliedImmutable } from "../type-graph/types/immutable-type";
import { inferenceTupleType } from "./tuple-type";
import { inferenceFunctionLiteralType } from "./function-type";
import type { Node } from "@babel/parser";
import type { Handler } from "../utils/traverse";

export function inferenceTypeForNode(
  currentNode: Node,
  typeScope: TypeScope,
  parentScope: VariableScope | ModuleScope,
  typeGraph: ModuleScope,
  parentNode: Node,
  pre: Handler,
  middle: Handler,
  post: Handler,
  isTypeDefinitions: boolean = false,
  isImmutable: boolean = false
): Type {
  let result = null;
  switch (currentNode.type) {
    case NODE.NUMERIC_LITERAL:
      result = Type.term(currentNode.value, {
        isSubtypeOf: Type.Number
      });
      break;
    case NODE.BIGINT_LITERAL:
      result = Type.term(`${currentNode.value}n`, {
        isSubtypeOf: Type.BigInt
      });
      break;
    case NODE.TEMPLATE_LITERAL:
      result = Type.String;
      break;
    case NODE.STRING_LITERAL:
      result = Type.term(`'${currentNode.value}'`, {
        isSubtypeOf: Type.String
      });
      break;
    case NODE.BOOLEAN_LITERAL:
      result = Type.term(currentNode.value, {
        isSubtypeOf: Type.Boolean
      });
      break;
    case NODE.NULL_LITERAL:
      result = Type.Null;
      break;
    case NODE.REG_EXP_LITERAL:
      result = Type.find("RegExp");
      break;
    case NODE.ARRAY_EXPRESSION:
      result = inferenceTupleType(
        currentNode,
        typeScope,
        parentScope,
        typeGraph,
        parentNode,
        pre,
        middle,
        post
      );
      break;
    case NODE.OBJECT_EXPRESSION:
    case NODE.CLASS_EXPRESSION:
      const objectScope = typeGraph.scopes.get(
        VariableScope.getName(currentNode)
      );
      if (objectScope === undefined) {
        throw new Error("Never!!!");
      }
      const self =
        objectScope.type === VariableScope.OBJECT_TYPE
          ? objectScope.body.get(THIS_TYPE)
          : objectScope.declaration;
      if (!(self instanceof VariableInfo)) {
        throw new Error("Never!!!");
      }
      result = self.type;
      break;
    case NODE.OBJECT_METHOD:
    case NODE.CLASS_METHOD:
    case NODE.FUNCTION_DECLARATION:
    case NODE.TS_DECLARE_METHOD:
    case NODE.FUNCTION_EXPRESSION:
    case NODE.ARROW_FUNCTION_EXPRESSION:
    case NODE.TS_FUNCTION_DECLARATION:
      result = inferenceFunctionLiteralType(
        currentNode,
        typeScope,
        parentScope,
        typeGraph,
        isTypeDefinitions,
        parentNode,
        pre,
        middle,
        post
      );
      break;
    case NODE.IDENTIFIER:
    case NODE.THIS_EXPRESSION:
      const query = { ...currentNode, name: currentNode.name || THIS_TYPE };
      const variableInfo = parentScope.findVariable(query);
      result = variableInfo.type;
      break;
  }
  if (
    isImmutable &&
    result !== null &&
    currentNode.type !== NODE.IDENTIFIER &&
    currentNode.type !== NODE.THIS_EXPRESSION
  ) {
    result = $AppliedImmutable.term(null, {}, result);
  }
  if (result) {
    return result;
  }
  throw new Error(currentNode.type);
}
