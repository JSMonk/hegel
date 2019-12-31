// @flow
import NODE from "../utils/nodes";
import { Type } from "../type-graph/types/type";
import { Scope } from "../type-graph/scope";
import { THIS_TYPE } from "../type-graph/constants";
import { ModuleScope } from "../type-graph/module-scope";
import { ObjectType } from "../type-graph/types/object-type";
import { VariableInfo } from "../type-graph/variable-info";
import { findVariableInfo } from "../utils/common";
import { inferenceTupleType } from "./tuple-type";
import { inferenceFunctionLiteralType } from "./function-type";
import type { Node } from "@babel/parser";
import type { Handler } from "../utils/traverse";

export function inferenceTypeForNode(
  currentNode: Node,
  typeScope: Scope,
  parentScope: Scope | ModuleScope,
  typeGraph: ModuleScope,
  parentNode: Node,
  pre: Handler,
  middle: Handler,
  post: Handler,
  isTypeDefinitions: boolean = false
): Type {
  switch (currentNode.type) {
    case NODE.NUMERIC_LITERAL:
      return Type.createTypeWithName(currentNode.value, typeScope, {
        isSubtypeOf: Type.createTypeWithName("number", typeScope)
      });
    case NODE.BIGINT_LITERAL:
      return Type.createTypeWithName(`${currentNode.value}n`, typeScope, {
        isSubtypeOf: Type.createTypeWithName("bigint", typeScope)
      });
    case NODE.TEMPLATE_LITERAL:
      return Type.createTypeWithName("string", typeScope);
    case NODE.STRING_LITERAL:
      return Type.createTypeWithName(`'${currentNode.value}'`, typeScope, {
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
      const objectScope = typeGraph.body.get(Scope.getName(currentNode));
      if (!(objectScope instanceof Scope)) {
        throw new Error("Never!!!");
      }
      const self = objectScope.body.get(THIS_TYPE);
      if (!(self instanceof VariableInfo)) {
        throw new Error("Never!!!");
      }
      return self.type;
    case NODE.OBJECT_METHOD:
    case NODE.CLASS_METHOD:
    case NODE.FUNCTION_DECLARATION:
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
    case NODE.NEW_EXPRESSION:
      const constructor: any = findVariableInfo(
        currentNode.callee,
        parentScope
      );
      return constructor.type.returnType;
    case NODE.IDENTIFIER:
    case NODE.THIS_EXPRESSION:
      const query = { ...currentNode, name: currentNode.name || THIS_TYPE };
      const variableInfo = findVariableInfo(query, parentScope);
      return variableInfo.type;
  }
  throw new Error(currentNode.type);
}
