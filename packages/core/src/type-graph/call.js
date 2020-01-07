// @flow
import NODE from "../utils/nodes";
import HegelError from "../utils/errors";
import { Meta } from "./meta/meta";
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
import { addToThrowable } from "../utils/throwable";
import { isCallableType } from "../utils/function-utils";
import { getVariableType } from "../utils/variable-utils";
import { inferenceTypeForNode } from "../inference";
import { THIS_TYPE, CALLABLE, CONSTRUCTABLE } from "./constants";
import {
  getRawFunctionType,
  getInvocationType
} from "../inference/function-type";
import { getWrapperType, getTypeFromTypeAnnotation } from "../utils/type-utils";
import {
  getParentForNode,
  findNearestTypeScope,
  findNearestScopeByType
} from "../utils/scope-utils";
import {
  getAnonymousKey,
  findVariableInfo,
  addAndTraverseFunctionWithType
} from "../utils/common";
import type { Handler } from "../utils/traverse";
import type { CallableArguments } from "./meta/call-meta";
import type {
  Node,
  ClassProperty,
  ObjectProperty,
  ClassMethod,
  ObjectMethod
} from "@babel/core";

type CallResult = {
  inferenced?: boolean,
  result: CallableArguments
};

type CallableMeta = {
  isForAssign?: boolean
};

export function addCallToTypeGraph(
  node: ?Node,
  typeGraph: ModuleScope,
  currentScope: Scope | ModuleScope,
  parentNode: Node,
  pre: Handler,
  middle: Handler,
  post: Handler,
  meta?: CallableMeta = {}
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
  if(node.type === NODE.SUPER) {
    node = { type: NODE.IDENTIFIER, name: "super", loc: node.loc }; 
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
          middle,
          post,
          meta
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
          middle,
          post,
          meta
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
          middle,
          post,
          meta
        ).result
      ];
      break;
    case NODE.FOR_STATEMENT:
      target = findVariableInfo({ name: "for", loc: node.loc }, currentScope);
      args = [
        Type.createTypeWithName("unknown", typeScope),
        node.test
          ? addCallToTypeGraph(
              node.test,
              typeGraph,
              // $FlowIssue
              typeGraph.body.get(Scope.getName(node.body)),
              parentNode,
              pre,
              middle,
              post,
              meta
            ).result
          : Type.createTypeWithName("undefined", typeScope),
        Type.createTypeWithName("unknown", typeScope)
      ];
      break;
    case NODE.FUNCTION_EXPRESSION:
    case NODE.ARROW_FUNCTION_EXPRESSION:
    case NODE.IDENTIFIER:
      const nodeName =
        node.type === NODE.IDENTIFIER
          ? node
          : { name: getAnonymousKey(node), loc: node.loc };
      const varInfo = findVariableInfo(
        nodeName,
        currentScope,
        parentNode,
        typeGraph,
        pre,
        middle,
        post
      );
      if (node.type === NODE.IDENTIFIER) {
        addPosition(node, varInfo, typeGraph);
      }
      return { result: varInfo };
    case NODE.CLASS_PROPERTY:
    case NODE.OBJECT_PROPERTY:
      const self = findVariableInfo({ name: THIS_TYPE }, currentScope).type;
      const selfObject =
        // $FlowIssue
        self instanceof ObjectType ? self : self.subordinateType;
      const propertyType = selfObject.properties.get(
        node.key.name || `${node.key.value}`
      );
      if (propertyType === undefined) {
        throw new Error("Never!!!");
      }
      const value =
        node.value === null
          ? {
              result: Type.createTypeWithName("undefined", typeScope),
              inferenced: false
            }
          : addCallToTypeGraph(
              node.value,
              typeGraph,
              currentScope,
              parentNode,
              pre,
              middle,
            post,
            meta
            );
      inferenced = value.inferenced;
      args = [
        node.typeAnnotation != null ? propertyType : value.result,
        value.result
      ];
      targetName = "=";
      target = findVariableInfo(
        { name: targetName, loc: node.loc },
        currentScope
      );
      break;
    case NODE.VARIABLE_DECLARATOR:
      const variableType = findVariableInfo(node.id, currentScope);
      addPosition(node.id, variableType, typeGraph);
      const init =
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
              middle,
              post,
            meta
            );
      inferenced = init.inferenced;
      args = [variableType, init.result];
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
        middle,
        post,
        meta
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
        currentScope,
        parentNode,
        typeGraph,
        pre,
        middle,
        post
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
          middle,
          post,
          meta
        ).result
      ];
      targetName = "await";
      target = findVariableInfo(
        { name: targetName, loc: node.loc },
        currentScope,
        parentNode,
        typeGraph,
        pre,
        middle,
        post
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
          middle,
          post,
          meta
        ).result,
        addCallToTypeGraph(
          node.right,
          typeGraph,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
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
        middle,
        post,
        meta
      );
      const left = addCallToTypeGraph(
        node.left,
        typeGraph,
        currentScope,
        parentNode,
        pre,
        middle,
        post,
        { isForAssign: true }
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
        middle,
        post,
        meta
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
        currentScope,
        parentNode,
        typeGraph,
        pre,
        middle,
        post
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
          middle,
          post,
          meta
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
          middle,
          post,
          meta
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
        middle,
        post,
        meta
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
            middle,
            post,
            meta
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
              middle,
              post,
            meta
            ).result
      ];
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
          middle,
          post,
          meta
        ).result,
        addCallToTypeGraph(
          node.consequent,
          typeGraph,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result,
        addCallToTypeGraph(
          node.alternate,
          typeGraph,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
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
        middle,
        post,
        meta
      ).result;
      const argumentType =
        argument instanceof VariableInfo ? argument.type : argument;
      const potentialArgument = addCallToTypeGraph(
        { ...node, type: NODE.CALL_EXPRESSION, isConstructor: true },
        typeGraph,
        currentScope,
        parentNode,
        pre,
        middle,
        post,
        meta
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
      if (node.callee.type === NODE.IDENTIFIER || node.callee.type === NODE.SUPER) {
        const callee = node.callee.type === NODE.IDENTIFIER ? node.callee : { name: "super", loc: node.callee.loc };
        target = findVariableInfo(
          callee,
          currentScope,
          parentNode,
          typeGraph,
          pre,
          middle,
          post
        );
        targetName = callee.name;
        if (
          !(target.type instanceof FunctionType) ||
          !(
            target.type instanceof GenericType &&
            target.type.subordinateType instanceof FunctionType
          )
        ) {
          target =
            target.type.getPropertyType(
              node.isConstructor ? CONSTRUCTABLE : CALLABLE
            ) || target;
          target =
            target instanceof VariableInfo
              ? target
              : new VariableInfo(target, currentScope);
        }
        addPosition(node.callee, target, typeGraph);
      } else {
        target = (addCallToTypeGraph(
          node.callee,
          typeGraph,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result: any);
      }
      const targetType = target instanceof VariableInfo ? target.type : target;
      let fnType =
        targetType instanceof GenericType
          ? targetType.subordinateType
          : targetType;
      const localTypeScope =
        targetType instanceof GenericType
          ? targetType.localTypeScope
          : typeScope;
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
                middle,
                post,
              meta
              ).result
      );
      fnType = getRawFunctionType(
        // $FlowIssue
        targetType,
        args,
        null,
        localTypeScope,
        node.loc
      );
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
                middle,
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
    case NODE.THIS_EXPRESSION:
      const selfVar = findVariableInfo({ name: THIS_TYPE, loc: node.loc }, currentScope);
      const nearestFunctionScope = findNearestScopeByType(Scope.FUNCTION_TYPE, currentScope);
      nearestFunctionScope.calls.push(new CallMeta(undefined, [], node.loc, "this"));
      return { result: selfVar.type, inferenced: false };
    default:
      return {
        result: inferenceTypeForNode(
          node,
          typeScope,
          currentScope,
          typeGraph,
          parentNode,
          pre,
          middle,
          post
        ),
        inferenced: true
      };
  }
  const targetType = target instanceof VariableInfo ? target.type : target;
  const options = {
    pre,
    args,
    meta,
    node,
    post,
    middle,
    target,
    typeGraph,
    typeScope,
    targetType,
    parentNode,
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
    currentScope.calls.push(callMeta);
  }
  return { result: invocationType, inferenced };
}

function invoke({
  parentNode,
  typeScope,
  typeGraph,
  pre,
  middle,
  post,
  target,
  targetType,
  genericArguments,
  args,
  node,
  meta
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
  try {
    const invocationType = getInvocationType(
      targetType,
      args,
      genericArguments,
      typeScope,
      node.loc,
      meta.isForAssign
    );
    if (!(invocationType instanceof Type)) {
      return {
        result: addPropertyToThis(
          invocationType,
          parentNode,
          typeScope,
          typeGraph,
          pre,
          middle,
          post
        ),
        inferenced: false
      };
    }
    if (
      targetType instanceof TypeVar &&
      !targetType.isUserDefined &&
      target instanceof VariableInfo
    ) {
      // $FlowIssue
      let func = findNearestScopeByType(Scope.FUNCTION_TYPE, target.parent);
      if (
        func.declaration &&
        func.declaration.type instanceof GenericType &&
        invocationType instanceof TypeVar
      ) {
        const genericArguments = func.declaration.type.genericArguments;
        genericArguments.push(invocationType);
        const fn = Type.getTypeRoot(targetType);
        fn.argumentsTypes.forEach(arg => {
          if (
            arg instanceof TypeVar &&
            !arg.isUserDefined &&
            !genericArguments.includes(arg)
          ) {
            genericArguments.push(arg);
          }
        });
      }
    }
    return {
      result: invocationType,
      inferenced:
        isInferencedTypeVar(targetType) &&
        isInferencedTypeVar(invocationType, true)
    };
  } catch (e) {
    if (e.loc === undefined) {
      e.loc = node.loc;
    }
    throw e;
  }
}

function isInferencedTypeVar(t: Type, withoutRoot: boolean = false) {
  return (
    t instanceof TypeVar &&
    !t.isUserDefined &&
    (!withoutRoot || t.root === undefined)
  );
}

export function addPropertyToThis(
  currentNode: ClassProperty | ObjectProperty | ClassMethod | ObjectMethod,
  parentNode: Node,
  typeScope: Scope,
  typeGraph: ModuleScope,
  precompute: Handler,
  middlecompute: Handler,
  postcompute: Handler
) {
  const propertyName = currentNode.key.name || `${currentNode.key.value}`;
  const currentClassScope = getParentForNode(
    currentNode,
    parentNode,
    typeGraph
  );
  const self = findVariableInfo({ name: THIS_TYPE }, currentClassScope);
  const selfType =
    self.type instanceof GenericType ? self.type.subordinateType : self.type;
  if (currentClassScope.declaration !== undefined) {
    // $FlowIssue
    return selfType.properties.get(propertyName).type;
  }
  const currentTypeScope =
    self.type instanceof GenericType ? self.type.localTypeScope : typeScope;
  let type = new Type("undefined", { isSubtypeFor: new Type("void") });
  if (currentNode.typeAnnotation != null) {
    type = getTypeFromTypeAnnotation(
      currentNode.typeAnnotation,
      currentTypeScope,
      currentClassScope,
      false,
      null,
      parentNode,
      typeGraph,
      precompute,
      middlecompute,
      postcompute
    );
  }
  const property = new VariableInfo(
    type,
    currentClassScope,
    new Meta(currentNode.loc)
  );
  if (!(selfType instanceof ObjectType)) {
    throw new Error("Never!!!");
  }
  selfType.properties.set(propertyName, property);
  addPosition(currentNode.key, property, typeGraph);
  if (
    currentNode.type === NODE.OBJECT_METHOD ||
    currentNode.type === NODE.CLASS_METHOD
  ) {
    const fn = addAndTraverseFunctionWithType(
      null,
      currentNode,
      parentNode,
      typeGraph,
      precompute,
      middlecompute,
      postcompute
    );
    property.hasInitializer = true;
    if (fn === undefined) {
      throw new Error("Never!!!");
    }
    property.type = fn.type;
  } else if (currentNode.value != null) {
    const inferencedType = addCallToTypeGraph(
      currentNode,
      typeGraph,
      currentClassScope,
      parentNode,
      precompute,
      middlecompute,
      postcompute
    ).result;
    property.hasInitializer = true;
    if (currentNode.typeAnnotation === undefined) {
      property.type = inferencedType;
    }
  }
  return property.type;
}
