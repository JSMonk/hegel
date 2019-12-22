// @flow
import NODE from "../utils/nodes";
import HegelError from "../utils/errors";
import { Type } from "./types/type";
import { $Keys } from "./types/keys-type";
import { Scope } from "./scope";
import { $Values } from "./types/values-type";
import { TypeVar } from "./types/type-var";
import { CallMeta } from "./meta/call-meta";
import { UnionType } from "./types/union-type";
import { ObjectType } from "./types/object-type";
import { ModuleScope } from "./module-scope";
import { addPosition } from "../utils/position-utils";
import { GenericType } from "./types/generic-type";
import { $BottomType } from "./types/bottom-type";
import { FunctionType } from "./types/function-type";
import { VariableInfo } from "./variable-info";
import { $PropertyType } from "./types/property-type";
import { addToThrowable } from "../utils/throwable";
import { getWrapperType } from "../utils/type-utils";
import { getVariableType } from "../utils/variable-utils";
import { inferenceTypeForNode } from "../inference";
import { getAnonymousKey, findVariableInfo } from "../utils/common";
import {
  isCallableType,
  addAndTraverseFunctionWithType
} from "../utils/function-utils";
import {
  clearRoot,
  getRawFunctionType,
  getInvocationType,
  isGenericFunctionType
} from "../inference/function-type";
import {
  findNearestTypeScope,
  findNearestScopeByType
} from "../utils/scope-utils";
import type { Node } from "@babel/parser";
import type { Handler } from "../utils/traverse";
import type { CallableArguments } from "./meta/call-meta";

type CallResult = {
  inferenced?: boolean,
  result: CallableArguments
};

export function addCallToTypeGraph(
  node: ?Node,
  typeGraph: ModuleScope,
  currentScope: Scope | ModuleScope,
  parentNode: Node,
  pre: Handler,
  post: Handler
): CallResult {
  let target: ?VariableInfo | Type = null;
  let inferenced = undefined;
  let targetName: string = "";
  let args: ?Array<CallableArguments> = null;
  let genericArguments: ?Array<CallableArguments> = null;
  const typeScope = findNearestTypeScope(currentScope, typeGraph);
  if (!(typeScope instanceof Scope)) {
    throw new Error("Never!");
  }
  if (node == null) {
    return {
      result: Type.createTypeWithName("void", typeScope),
      inferenced: false
    };
  }
  if (node.type === NODE.EXPRESSION_STATEMENT) {
    node = node.expression;
  }
  switch (node.type) {
    case NODE.IF_STATEMENT:
      target = findVariableInfo({ name: "if", loc: node.loc }, currentScope);
      args = [
        addCallToTypeGraph(
          node.test,
          typeGraph,
          currentScope,
          parentNode,
          pre,
          post
        ).result
      ];
      break;
    case NODE.WHILE_STATEMENT:
      target = findVariableInfo({ name: "while", loc: node.loc }, currentScope);
      args = [
        addCallToTypeGraph(
          node.test,
          typeGraph,
          currentScope,
          parentNode,
          pre,
          post
        ).result
      ];
      break;
    case NODE.DO_WHILE_STATEMENT:
      target = findVariableInfo(
        { name: "do-while", loc: node.loc },
        currentScope
      );
      args = [
        addCallToTypeGraph(
          node.test,
          typeGraph,
          currentScope,
          parentNode,
          pre,
          post
        ).result
      ];
      break;
    case NODE.FOR_STATEMENT:
      target = findVariableInfo({ name: "for", loc: node.loc }, currentScope);
      args = [
        Type.createTypeWithName("mixed", typeScope),
        node.test
          ? addCallToTypeGraph(
              node.test,
              typeGraph,
              // $FlowIssue
              typeGraph.body.get(Scope.getName(node.body)),
              parentNode,
              pre,
              post
            ).result
          : Type.createTypeWithName("undefined", typeScope),
        Type.createTypeWithName("mixed", typeScope)
      ];
      break;
    case NODE.FUNCTION_EXPRESSION:
    case NODE.ARROW_FUNCTION_EXPRESSION:
    case NODE.CLASS_DECLARATION:
    case NODE.IDENTIFIER:
      const nodeName =
        node.type === NODE.IDENTIFIER
          ? node
          : { name: getAnonymousKey(node), loc: node.loc };
      const varInfo = findVariableInfo(nodeName, currentScope);
      if (node.type === NODE.IDENTIFIER) {
        addPosition(node, varInfo, typeGraph);
      }
      return { result: varInfo };
    case NODE.VARIABLE_DECLARATOR:
      const variableType = findVariableInfo(node.id, currentScope);
      addPosition(node.id, variableType, typeGraph);
      const value =
        node.init === null
          ? {
              result: Type.createTypeWithName("undefined", typeScope),
              inferenced: false
            }
          : addCallToTypeGraph(
              node.init,
              typeGraph,
              currentScope,
              parentNode,
              pre,
              post
            );
      inferenced = value.inferenced;
      args = [variableType, value.result];
      targetName = "=";
      target = findVariableInfo(
        { name: targetName, loc: node.loc },
        currentScope
      );
      break;
    case NODE.THROW_STATEMENT:
      const error = addCallToTypeGraph(
        node.argument,
        typeGraph,
        currentScope,
        parentNode,
        pre,
        post
      );
      args = [
        getVariableType(
          null,
          error.result instanceof VariableInfo
            ? error.result.type
            : error.result,
          typeScope,
          error.inferenced
        )
      ];
      targetName = "throw";
      target = findVariableInfo(
        { name: targetName, loc: node.loc },
        currentScope
      );
      addToThrowable(args[0], currentScope);
      break;
    case NODE.AWAIT_EXPRESSION:
      args = [
        addCallToTypeGraph(
          node.argument,
          typeGraph,
          currentScope,
          parentNode,
          pre,
          post
        ).result
      ];
      targetName = "await";
      target = findVariableInfo(
        { name: targetName, loc: node.loc },
        currentScope
      );
      break;
    case NODE.BINARY_EXPRESSION:
    case NODE.LOGICAL_EXPRESSION:
      args = [
        addCallToTypeGraph(
          node.left,
          typeGraph,
          currentScope,
          parentNode,
          pre,
          post
        ).result,
        addCallToTypeGraph(
          node.right,
          typeGraph,
          currentScope,
          parentNode,
          pre,
          post
        ).result
      ];
      targetName = node.operator === "+" ? "b+" : node.operator;
      targetName = node.operator === "-" ? "b-" : targetName;
      target = findVariableInfo(
        { name: targetName, loc: node.loc },
        currentScope
      );
      break;
    case NODE.ASSIGNMENT_EXPRESSION:
    case NODE.ASSIGNMENT_PATTERN:
      const right = addCallToTypeGraph(
        node.right,
        typeGraph,
        currentScope,
        parentNode,
        pre,
        post
      );
      const left = addCallToTypeGraph(
        node.left,
        typeGraph,
        currentScope,
        parentNode,
        pre,
        post
      );
      args = [left.result, right.result];
      if (left.result instanceof VariableInfo && left.result.isConstant) {
        throw new HegelError(
          "Cannot assign to variable because it is a constant.",
          node.loc
        );
      }
      targetName = node.operator || "=";
      target = findVariableInfo(
        { name: targetName, loc: node.loc },
        currentScope
      );
      inferenced = right.inferenced;
      break;
    case NODE.RETURN_STATEMENT:
      targetName = "return";
      const arg = addCallToTypeGraph(
        node.argument,
        typeGraph,
        currentScope,
        parentNode,
        pre,
        post
      );
      args = [arg.result];
      inferenced = arg.inferenced;
      const fn: any = findNearestScopeByType(Scope.FUNCTION_TYPE, currentScope);
      if (fn instanceof ModuleScope) {
        throw new HegelError("Call return outside function", node.loc);
      }
      const declaration =
        fn.declaration.type instanceof GenericType
          ? fn.declaration.type.subordinateType
          : fn.declaration.type;
      target = findVariableInfo(
        { name: targetName, loc: node.loc },
        currentScope
      );
      target =
        declaration.returnType instanceof $BottomType ||
        (declaration.returnType instanceof TypeVar &&
          !declaration.returnType.isUserDefined)
          ? target
          : // $FlowIssue
            target.type.applyGeneric([declaration.returnType], node.loc);
      break;
    case NODE.UNARY_EXPRESSION:
    case NODE.UPDATE_EXPRESSION:
      targetName = node.operator;
      args = [
        addCallToTypeGraph(
          node.argument,
          typeGraph,
          currentScope,
          parentNode,
          pre,
          post
        ).result
      ];
      target = findVariableInfo(
        { name: targetName, loc: node.loc },
        currentScope
      );
      break;
    case NODE.PURE_KEY:
      args = [
        addCallToTypeGraph(
          node.of,
          typeGraph,
          currentScope,
          parentNode,
          pre,
          post
        ).result
      ];
      targetName = "Object.keys";
      target = new FunctionType(
        targetName,
        [],
        new $Keys().applyGeneric(
          args.map(a => (a instanceof VariableInfo ? a.type : a)),
          node.loc
        )
      );
      break;
    case NODE.PURE_VALUE:
      target = addCallToTypeGraph(
        node.of,
        typeGraph,
        currentScope,
        parentNode,
        pre,
        post
      ).result;
      args = [target];
      targetName = "Object.values";
      target = new $Values().applyGeneric(
        args.map(a => (a instanceof VariableInfo ? a.type : a)),
        node.loc
      );
      target = new FunctionType(targetName, [], target);
      break;
    case NODE.MEMBER_EXPRESSION:
      args = [
        getWrapperType(
          addCallToTypeGraph(
            node.object,
            typeGraph,
            currentScope,
            parentNode,
            pre,
            post
          ).result,
          typeGraph
        ),
        node.property.type === NODE.IDENTIFIER && !node.computed
          ? Type.createTypeWithName(`'${node.property.name}'`, typeScope, {
              isSubtypeOf: Type.createTypeWithName("string", typeScope)
            })
          : addCallToTypeGraph(
              node.property,
              typeGraph,
              currentScope,
              parentNode,
              pre,
              post
            ).result
      ];
      if (node.property.type === NODE.IDENTIFIER) {
        const property = new $PropertyType();
        addPosition(
          node.property,
          args[1].type instanceof TypeVar
            ? new Type(
                GenericType.getName(property.name, [args[1].type || args[1]])
              )
            : property.applyGeneric(
                [args[0].type || args[0], args[1].type || args[1]],
                node.loc,
                true,
                true
              ),
          typeGraph
        );
      }
      genericArguments = args;
      targetName = ".";
      target = findVariableInfo(
        { name: targetName, loc: node.loc },
        currentScope
      );
      break;
    case NODE.CONDITIONAL_EXPRESSION:
      args = [
        addCallToTypeGraph(
          node.test,
          typeGraph,
          currentScope,
          parentNode,
          pre,
          post
        ).result,
        addCallToTypeGraph(
          node.consequent,
          typeGraph,
          currentScope,
          parentNode,
          pre,
          post
        ).result,
        addCallToTypeGraph(
          node.alternate,
          typeGraph,
          currentScope,
          parentNode,
          pre,
          post
        ).result
      ];
      targetName = "?:";
      target = findVariableInfo(
        { name: targetName, loc: node.loc },
        currentScope
      );
      break;
    case NODE.NEW_EXPRESSION:
      const argument = addCallToTypeGraph(
        node.callee,
        typeGraph,
        currentScope,
        parentNode,
        pre,
        post
      ).result;
      const argumentType =
        argument instanceof VariableInfo ? argument.type : argument;
      const potentialArgument = addCallToTypeGraph(
        { ...node, type: NODE.CALL_EXPRESSION },
        typeGraph,
        currentScope,
        parentNode,
        pre,
        post
      ).result;
      const defaultObject = ObjectType.createTypeWithName("{ }", typeScope, []);
      args = [
        defaultObject.isPrincipalTypeFor(potentialArgument)
          ? potentialArgument
          : defaultObject
      ];
      targetName = "new";
      target = findVariableInfo(
        { name: targetName, loc: node.loc },
        currentScope
      );
      break;
    case NODE.CALL_EXPRESSION:
      if (node.callee.type === NODE.IDENTIFIER) {
        target = findVariableInfo(node.callee, currentScope);
        addPosition(node.callee, target, typeGraph);
      } else {
        target = (addCallToTypeGraph(
          node.callee,
          typeGraph,
          currentScope,
          parentNode,
          pre,
          post
        ).result: any);
      }
      const targetType = target instanceof VariableInfo ? target.type : target;
      let fnType =
        targetType instanceof GenericType
          ? targetType.subordinateType
          : targetType;
      if (
        !(fnType instanceof FunctionType) &&
        !(fnType instanceof TypeVar && !fnType.isUserDefined)
      ) {
        throw new HegelError(
          fnType instanceof UnionType && fnType.variants.every(isCallableType)
            ? `Signatures of each variant of type "${String(
                fnType.name
              )}" are not compatible with each other`
            : `The type "${String(fnType.name)}" is not callable.`,
          node.loc
        );
      }
      args = node.arguments.map(
        (n, i) =>
          n.type === NODE.FUNCTION_EXPRESSION ||
          n.type === NODE.ARROW_FUNCTION_EXPRESSION
            ? // $FlowIssue
              (fnType.argumentsTypes || [])[i]
            : addCallToTypeGraph(
                n,
                typeGraph,
                currentScope,
                parentNode,
                pre,
                post
              ).result
      );
      // $FlowIssue
      fnType = getRawFunctionType(targetType, args, null, node.loc);
      args = node.arguments.map(
        (n, i) =>
          n.type === NODE.FUNCTION_EXPRESSION ||
          n.type === NODE.ARROW_FUNCTION_EXPRESSION
            ? // $FlowIssue
              addAndTraverseFunctionWithType(
                // $FlowIssue
                (fnType.argumentsTypes || [])[i],
                n,
                parentNode,
                typeGraph,
                pre,
                post
              )
            : // $FlowIssue
              args[i]
      );
      const throwableType: any =
        targetType instanceof GenericType
          ? targetType.subordinateType
          : targetType;
      if (throwableType.throwable) {
        addToThrowable(throwableType.throwable, currentScope);
      }
      inferenced =
        targetType instanceof GenericType &&
        targetType.subordinateType.returnType instanceof TypeVar;
      break;
    default:
      return {
        result: inferenceTypeForNode(
          node,
          typeScope,
          currentScope,
          typeGraph,
          parentNode,
          pre,
          post
        ),
        inferenced: true
      };
  }
  const callsScope =
    currentScope.type === Scope.FUNCTION_TYPE
      ? currentScope
      : findNearestScopeByType(Scope.FUNCTION_TYPE, currentScope);
  const targetType = target instanceof VariableInfo ? target.type : target;
  const options = {
    targetName,
    target,
    targetType,
    args,
    node,
    typeScope,
    callsScope,
    moduleScope: typeGraph,
    genericArguments:
      genericArguments &&
      genericArguments.map(a => (a instanceof Type ? a : a.type))
  };
  const getResult = targetType => {
    const { result, inferenced: localInferenced } = invoke({
      ...options,
      targetType
    });
    inferenced = inferenced || localInferenced;
    return result;
  };
  const invocationType =
    targetType instanceof UnionType
      ? new UnionType(null, targetType.variants.map(getResult))
      : getResult(targetType);
  if (!(targetType instanceof $BottomType)) {
    const callMeta = new CallMeta(
      (target: any),
      args,
      node.loc,
      targetName,
      inferenced
    );
    callsScope.calls.push(callMeta);
  }
  return { result: invocationType, inferenced };
}

function invoke({
  targetName,
  target,
  targetType,
  genericArguments,
  args,
  node,
  typeScope,
  moduleScope,
  callsScope
}) {
  if (
    !(targetType instanceof $BottomType) &&
    !(targetType instanceof TypeVar && !targetType.isUserDefined) &&
    !(targetType instanceof FunctionType) &&
    !(
      targetType instanceof GenericType &&
      targetType.subordinateType instanceof FunctionType
    )
  ) {
    throw new HegelError("The target is not callable type.", node.loc);
  }
  const invocationType = getInvocationType(
    targetType,
    args,
    genericArguments,
    node.loc
  );
  return {
    result: invocationType,
    inferenced:
      isInferencedTypeVar(targetType) &&
      isInferencedTypeVar(invocationType, true)
  };
}

function isInferencedTypeVar(t: Type, withoutRoot: boolean = false) {
  return (
    t instanceof TypeVar &&
    !t.isUserDefined &&
    (!withoutRoot || t.root === undefined)
  );
}
