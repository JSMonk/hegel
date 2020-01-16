// @flow
import NODE from "../utils/nodes";
import HegelError from "../utils/errors";
import { Meta } from "./meta/meta";
import { Type } from "./types/type";
import { $Keys } from "./types/keys-type";
import { $Values } from "./types/values-type";
import { TypeVar } from "./types/type-var";
import { CallMeta } from "./meta/call-meta";
import { UnionType } from "./types/union-type";
import { ObjectType } from "./types/object-type";
import { GenericType } from "./types/generic-type";
import { $BottomType } from "./types/bottom-type";
import { FunctionType } from "./types/function-type";
import { VariableInfo } from "./variable-info";
import { VariableScope } from "./variable-scope";
import { addToThrowable } from "../utils/throwable";
import { isCallableType } from "../utils/function-utils";
import { getAnonymousKey } from "../utils/common";
import { getVariableType } from "../utils/variable-utils";
import { inferenceTypeForNode } from "../inference";
import { addFunctionToTypeGraph } from "../utils/function-utils";
import { ModuleScope, PositionedModuleScope } from "./module-scope";
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
import type { Handler } from "../utils/traverse";
import type { TypeScope } from "./type-scope";
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
  moduleScope: ModuleScope | PositionedModuleScope,
  currentScope: VariableScope | ModuleScope,
  parentNode: Node,
  pre: Handler,
  middle: Handler,
  post: Handler,
  meta?: CallableMeta = {}
): CallResult {
  let target: VariableInfo | Type | null = null;
  let inferenced = undefined;
  let targetName: string = "";
  let args: Array<CallableArguments> | null = null;
  let genericArguments: Array<CallableArguments> | null = null;
  const typeScope = findNearestTypeScope(currentScope, moduleScope);
  const withPositions = moduleScope instanceof PositionedModuleScope;
  if (node == null) {
    return {
      result: Type.Undefined,
      inferenced: false
    };
  }
  if (node.type === NODE.EXPRESSION_STATEMENT) {
    node = node.expression;
  }
  if (node.type === NODE.SUPER) {
    node = { type: NODE.IDENTIFIER, name: "super", loc: node.loc };
  }
  switch (node.type) {
    case NODE.IF_STATEMENT:
      target = currentScope.findVariable({ name: "if", loc: node.loc });
      args = [
        addCallToTypeGraph(
          node.test,
          moduleScope,
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
      target = currentScope.findVariable({ name: "while", loc: node.loc });
      args = [
        addCallToTypeGraph(
          node.test,
          moduleScope,
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
      target = currentScope.findVariable({ name: "do-while", loc: node.loc });
      args = [
        addCallToTypeGraph(
          node.test,
          moduleScope,
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
      target = currentScope.findVariable({ name: "for", loc: node.loc });
      args = [
        Type.Unknown,
        node.test
          ? addCallToTypeGraph(
              node.test,
              moduleScope,
              // $FlowIssue
              moduleScope.body.get(VariableScope.getName(node.body)),
              parentNode,
              pre,
              middle,
              post,
              meta
            ).result
          : Type.Undefined,
        Type.Unknown
      ];
      break;
    case NODE.FUNCTION_EXPRESSION:
    case NODE.ARROW_FUNCTION_EXPRESSION:
    case NODE.IDENTIFIER:
      const nodeName =
        node.type === NODE.IDENTIFIER
          ? node
          : { name: getAnonymousKey(node), loc: node.loc };
      const varInfo = currentScope.findVariable(
        nodeName,
        parentNode,
        moduleScope,
        pre,
        middle,
        post
      );
      if (withPositions && node.type === NODE.IDENTIFIER) {
        // $FlowIssue
        moduleScope.addPosition(node, varInfo);
      }
      return { result: varInfo };
    case NODE.CLASS_PROPERTY:
    case NODE.OBJECT_PROPERTY:
      const self = currentScope.findVariable({ name: THIS_TYPE });
      // $FlowIssue
      let selfObject: ObjectType = node.static
        // $FlowIssue
        ? self.parent.declaration.type
        : self.type;
      selfObject =
        selfObject instanceof GenericType
          ? selfObject.subordinateType
          : selfObject;
      const propertyType = selfObject.properties.get(
        node.key.name || `${node.key.value}`
      );
      if (propertyType === undefined) {
        throw new Error("Never!!!");
      }
      const value =
        node.value === null
          ? {
              result: Type.Undefined,
              inferenced: false
            }
          : addCallToTypeGraph(
              node.value,
              moduleScope,
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
      target = currentScope.findVariable({ name: targetName, loc: node.loc });
      break;
    case NODE.VARIABLE_DECLARATOR:
      const variableType = currentScope.findVariable(node.id);
      if (withPositions) {
        // $FlowIssue
        moduleScope.addPosition(node.id, variableType);
      }
      const init =
        node.init === null
          ? {
              result: Type.Undefined,
              inferenced: false
            }
          : addCallToTypeGraph(
              node.init,
              moduleScope,
              currentScope,
              parentNode,
              pre,
              middle,
              post,
              meta
            );
      inferenced = init.inferenced;
      targetName = "=";
      args = [variableType, init.result];
      target = currentScope.findVariable({ name: targetName, loc: node.loc })
        .type;
      break;
    case NODE.THROW_STATEMENT:
      const error = addCallToTypeGraph(
        node.argument,
        moduleScope,
        currentScope,
        parentNode,
        pre,
        middle,
        post,
        meta
      );
      args = [
        getVariableType(
          undefined,
          error.result instanceof VariableInfo
            ? error.result.type
            : error.result,
          typeScope,
          error.inferenced
        )
      ];
      targetName = "throw";
      target = currentScope.findVariable(
        { name: targetName, loc: node.loc },
        parentNode,
        moduleScope,
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
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result
      ];
      targetName = "await";
      target = currentScope.findVariable(
        { name: targetName, loc: node.loc },
        parentNode,
        moduleScope,
        pre,
        middle,
        post
      );
      break;
    case NODE.LOGICAL_EXPRESSION:
      args = [
        addCallToTypeGraph(
          node.left.body,
          moduleScope,
          // $FlowIssue
          moduleScope.body.get(VariableScope.getName(node.left)),
          node.left,
          pre,
          middle,
          post,
          meta
        ).result,
        addCallToTypeGraph(
          node.right.body,
          moduleScope,
          // $FlowIssue
          moduleScope.body.get(VariableScope.getName(node.right)),
          node.right,
          pre,
          middle,
          post,
          meta
        ).result
      ];
    case NODE.BINARY_EXPRESSION:
      args = args || [
        addCallToTypeGraph(
          node.left,
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result,
        addCallToTypeGraph(
          node.right,
          moduleScope,
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
      target = currentScope.findVariable({ name: targetName, loc: node.loc });
      break;
    case NODE.ASSIGNMENT_EXPRESSION:
    case NODE.ASSIGNMENT_PATTERN:
      const right = addCallToTypeGraph(
        node.right,
        moduleScope,
        currentScope,
        parentNode,
        pre,
        middle,
        post,
        meta
      );
      const left = addCallToTypeGraph(
        node.left,
        moduleScope,
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
      target = currentScope.findVariable({ name: targetName, loc: node.loc });
      inferenced = right.inferenced;
      break;
    case NODE.RETURN_STATEMENT:
      targetName = "return";
      const arg = addCallToTypeGraph(
        node.argument,
        moduleScope,
        currentScope,
        parentNode,
        pre,
        middle,
        post,
        meta
      );
      args = [arg.result];
      inferenced = arg.inferenced;
      const fn: any = findNearestScopeByType(
        VariableScope.FUNCTION_TYPE,
        currentScope
      );
      if (fn instanceof ModuleScope) {
        throw new HegelError("Call return outside function", node.loc);
      }
      const declaration =
        fn.declaration.type instanceof GenericType
          ? fn.declaration.type.subordinateType
          : fn.declaration.type;
      target = currentScope.findVariable(
        { name: targetName, loc: node.loc },
        parentNode,
        moduleScope,
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
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result
      ];
      target = currentScope.findVariable({ name: targetName, loc: node.loc });
      break;
    case NODE.PURE_KEY:
      args = [
        addCallToTypeGraph(
          node.of,
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result
      ];
      targetName = "Object.keys";
      target = new $Keys().applyGeneric(
        args.map(a => (a instanceof VariableInfo ? a.type : a)),
        node.loc
      );
      target = new FunctionType(targetName, {}, [], target);
      break;
    case NODE.PURE_VALUE:
      target = addCallToTypeGraph(
        node.of,
        moduleScope,
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
      target = new FunctionType(targetName, {}, [], target);
      break;
    case NODE.MEMBER_EXPRESSION:
      args = [
        getWrapperType(
          addCallToTypeGraph(
            node.object,
            moduleScope,
            currentScope,
            parentNode,
            pre,
            middle,
            post,
            meta
          ).result,
          moduleScope
        ),
        node.property.type === NODE.IDENTIFIER && !node.computed
          ? Type.term(`'${node.property.name}'`, { isSubtypeOf: Type.String })
          : addCallToTypeGraph(
              node.property,
              moduleScope,
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
      target = currentScope.findVariable({ name: targetName, loc: node.loc });
      break;
    case NODE.CONDITIONAL_EXPRESSION:
      args = [
        addCallToTypeGraph(
          node.test,
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result,
        addCallToTypeGraph(
          node.consequent,
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result,
        addCallToTypeGraph(
          node.alternate,
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result
      ];
      targetName = "?:";
      target = currentScope.findVariable({ name: targetName, loc: node.loc });
      break;
    case NODE.NEW_EXPRESSION:
      const argument = addCallToTypeGraph(
        node.callee,
        moduleScope,
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
        moduleScope,
        currentScope,
        parentNode,
        pre,
        middle,
        post,
        meta
      ).result;
      const defaultObject = ObjectType.term("{  }", {}, []);
      args = [
        ObjectType.Object.isPrincipalTypeFor(potentialArgument)
          ? potentialArgument
          : defaultObject
      ];
      targetName = "new";
      target = currentScope.findVariable({ name: targetName, loc: node.loc });
      break;
    case NODE.CALL_EXPRESSION:
      if (
        node.callee.type === NODE.IDENTIFIER ||
        node.callee.type === NODE.THIS_EXPRESSION ||
        node.callee.type === NODE.SUPER
      ) {
        targetName = node.callee.name;
        if (node.callee.type === NODE.SUPER) {
          targetName = "super";
        }
        if (node.callee.type === NODE.THIS_EXPRESSION) {
          targetName = THIS_TYPE;
        }
        target = currentScope.findVariable(
          { name: targetName, loc: node.callee.loc },
          parentNode,
          moduleScope,
          pre,
          middle,
          post
        );
        if (
          !(target.type instanceof FunctionType) &&
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
            typeof target.type === "string"
              ? VariableScope.addAndTraverseNodeWithType(
                // $FlowIssue
                undefined,
                target,
                parentNode,
                moduleScope,
                pre,
                middle,
                post
              )
              : target;
          target =
            target instanceof VariableInfo
              ? target
              : new VariableInfo(target, currentScope);
        }
        if (withPositions) {
          // $FlowIssue
          moduleScope.addPosition(node.callee, target);
        }
      } else {
        target = (addCallToTypeGraph(
          node.callee,
          moduleScope,
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
                moduleScope,
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
              VariableScope.addAndTraverseNodeWithType(
                // $FlowIssue
                (fnType.argumentsTypes || [])[i],
                n,
                parentNode,
                moduleScope,
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
      const selfVar = currentScope.findVariable({
        name: THIS_TYPE,
        loc: node.loc
      });
      const nearestFunctionScope = findNearestScopeByType(
        VariableScope.FUNCTION_TYPE,
        currentScope
      );
      nearestFunctionScope.calls.push(
        new CallMeta(undefined, [], node.loc, "this")
      );
      return { result: selfVar.type, inferenced: false };
    default:
      return {
        result: inferenceTypeForNode(
          node,
          typeScope,
          currentScope,
          moduleScope,
          parentNode,
          pre,
          middle,
          post
        ),
        inferenced: true
      };
  }
  if (target === null || args === null) {
    throw new Error("Never!!!");
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
    moduleScope,
    typeScope,
    targetType,
    parentNode,
    dropUnknown: targetName === "=",
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
      ? UnionType.term(null, {}, targetType.variants.map(getResult))
      : getResult(targetType);
  if (!(targetType instanceof $BottomType)) {
    const callMeta = new CallMeta(
      (target: any),
      args,
      node.loc,
      targetName,
      inferenced
    );
    while (currentScope.skipCalls !== false && currentScope !== moduleScope) {
      // $FlowIssue
      currentScope = currentScope.parent;
    }
    currentScope.calls.push(callMeta);
  }
  return { result: invocationType, inferenced };
}

function invoke({
  parentNode,
  typeScope,
  moduleScope,
  pre,
  middle,
  post,
  target,
  targetType,
  genericArguments,
  args,
  node,
  meta,
  dropUnknown
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
      meta.isForAssign,
      dropUnknown
    );
    if (!(invocationType instanceof Type)) {
      return {
        result: addPropertyToThis(
          invocationType,
          parentNode,
          typeScope,
          moduleScope,
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
      let func = findNearestScopeByType(
        VariableScope.FUNCTION_TYPE,
        // $FlowIssue
        target.parent
      );
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
  typeScope: TypeScope,
  moduleScope: ModuleScope | PositionedModuleScope,
  precompute: Handler,
  middlecompute: Handler,
  postcompute: Handler
) {
  const propertyName = currentNode.key.name || `${currentNode.key.value}`;
  // $FlowIssue
  const currentScope: VariableScope = getParentForNode(
    currentNode,
    parentNode,
    moduleScope
  );
  const currentClassScope: any = findNearestScopeByType(
    [VariableScope.CLASS_TYPE, VariableScope.OBJECT_TYPE],
    currentScope
  );
  // $FlowIssue
  const self: VariableInfo = currentNode.static
    ? currentClassScope.declaration
    : currentClassScope.findVariable({ name: THIS_TYPE });
  const selfType =
    self.type instanceof GenericType ? self.type.subordinateType : self.type;
  if (currentClassScope.isProcessed) {
    // $FlowIssue
    return selfType.properties.get(propertyName).type;
  }
  const currentTypeScope =
    self.type instanceof GenericType ? self.type.localTypeScope : typeScope;
  let type = Type.Undefined;
  if (currentNode.typeAnnotation != null) {
    type = getTypeFromTypeAnnotation(
      currentNode.typeAnnotation,
      currentTypeScope,
      currentClassScope,
      false,
      null,
      parentNode,
      moduleScope,
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
  if (currentNode.type === NODE.OBJECT_PROPERTY) {
    property.hasInitializer = true;
  }
  selfType.properties.set(propertyName, property);
  if (moduleScope instanceof PositionedModuleScope) {
    moduleScope.addPosition(currentNode.key, property);
  }
  if (
    currentNode.type === NODE.OBJECT_METHOD ||
    currentNode.type === NODE.CLASS_METHOD
  ) {
    const fn = VariableScope.addAndTraverseNodeWithType(
      null,
      currentNode,
      parentNode,
      moduleScope,
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
      moduleScope,
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

export function addMethodToThis(
  currentNode: Node,
  parentNode: Node,
  moduleScope: ModuleScope,
  pre: Handler,
  middle: Handler,
  post: Handler,
  isTypeDefinitions: boolean
) {
  const currentScope = moduleScope.body.get(VariableScope.getName(parentNode));
  if (!(currentScope instanceof VariableScope)) {
    throw new Error("Never!!!");
  }
  const classScope: any = findNearestScopeByType(
    [VariableScope.CLASS_TYPE, VariableScope.OBJECT_TYPE],
    currentScope
  );
  if (classScope.isProcessed) {
    return;
  }
  const propertyName =
    currentNode.key.name === "constructor"
      ? CONSTRUCTABLE
      : currentNode.key.name;
  const self = classScope.findVariable({ name: THIS_TYPE });
  // $FlowIssue
  const classVar: VariableInfo =
    currentNode.static || propertyName === CONSTRUCTABLE
      ? classScope.declaration
      : self;
  const classType =
    classVar.type instanceof GenericType
      ? classVar.type.subordinateType
      : classVar.type;
  const methodScope = moduleScope.body.get(VariableScope.getName(currentNode));
  if (methodScope !== undefined && !isTypeDefinitions) {
    return false;
  }
  // $FlowIssue
  const existedProperty = classType.properties.get(propertyName);
  const expectedType =
    existedProperty instanceof VariableInfo ? existedProperty.type : undefined;
  currentNode.expected = currentNode.expected || expectedType;
  const fn = addFunctionToTypeGraph(
    currentNode,
    parentNode,
    moduleScope,
    pre,
    middle,
    post,
    isTypeDefinitions
  );
  fn.hasInitializer = true;
  if (!isTypeDefinitions && classScope.type === VariableScope.CLASS_TYPE) {
    const fnScope = moduleScope.body.get(VariableScope.getName(currentNode));
    // $FlowIssue
    fnScope.body.set(THIS_TYPE, currentNode.static ? classScope.declaration : self);
  }
  // $FlowIssue
  classType.properties.set(propertyName, fn);
  if (propertyName === CONSTRUCTABLE) {
    const type: FunctionType =
      fn.type instanceof GenericType ? fn.type.subordinateType : fn.type;
    type.returnType = ObjectType.Object.isPrincipalTypeFor(type.returnType)
      ? type.returnType
      : self.type;
    fn.type = type;
  }
}
