// @flow
import NODE from "../utils/nodes";
import { Type } from "../type-graph/types/type";
import { TypeScope } from "../type-graph/type-scope";
import { THIS_TYPE } from "../type-graph/constants";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import { VariableScope } from "../type-graph/variable-scope";
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
  isTypeDefinitions: boolean = false
): Type {
  switch (currentNode.type) {
    case NODE.NUMERIC_LITERAL:
      return Type.term(currentNode.value, {
        isSubtypeOf: Type.Number
      });
    case NODE.BIGINT_LITERAL:
      return Type.term(`${currentNode.value}n`, {
        isSubtypeOf: Type.BigInt
      });
    case NODE.TEMPLATE_LITERAL:
      return Type.String;
    case NODE.STRING_LITERAL:
      return Type.term(`'${currentNode.value}'`, {
        isSubtypeOf: Type.String
      });
    case NODE.BOOLEAN_LITERAL:
      return Type.term(currentNode.value, {
        isSubtypeOf: Type.Boolean
      });
    case NODE.NULL_LITERAL:
      return Type.Null;
    case NODE.REG_EXP_LITERAL:
      return Type.find("RegExp");
    case NODE.ARRAY_EXPRESSION:
      return inferenceTupleType(
        currentNode,
        typeScope,
        parentScope,
        typeGraph,
        parentNode,
        pre,
        middle,
        post
      );
    case NODE.OBJECT_EXPRESSION:
    case NODE.CLASS_EXPRESSION:
      const objectScope = typeGraph.body.get(
        VariableScope.getName(currentNode)
      );
      if (!(objectScope instanceof VariableScope)) {
        throw new Error("Never!!!");
      }
      const self =
        objectScope.type === VariableScope.OBJECT_TYPE
          ? objectScope.body.get(THIS_TYPE)
          : objectScope.declaration;
      if (!(self instanceof VariableInfo)) {
        throw new Error("Never!!!");
      }
      return self.type;
    case NODE.OBJECT_METHOD:
    case NODE.CLASS_METHOD:
    case NODE.FUNCTION_DECLARATION:
    case NODE.TS_DECLARE_METHOD:
    case NODE.FUNCTION_EXPRESSION:
    case NODE.ARROW_FUNCTION_EXPRESSION:
    case NODE.TS_FUNCTION_DECLARATION:
      return inferenceFunctionLiteralType(
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
    case NODE.IDENTIFIER:
    case NODE.THIS_EXPRESSION:
      const query = { ...currentNode, name: currentNode.name || THIS_TYPE };
      const variableInfo = parentScope.findVariable(query);
      return variableInfo.type;
  }
  throw new Error(currentNode.type);
}
