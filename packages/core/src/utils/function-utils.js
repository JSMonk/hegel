// @flow
import NODE from "./nodes";
import { Meta } from "../type-graph/meta/meta";
import { Type } from "../type-graph/types/type";
import { TypeVar } from "../type-graph/types/type-var";
import { UnionType } from "../type-graph/types/union-type";
import { GenericType } from "../type-graph/types/generic-type";
import { VariableInfo } from "../type-graph/variable-info";
import { VariableScope } from "../type-graph/variable-scope";
import { addVariableToGraph } from "./variable-utils";
import { inferenceTypeForNode } from "../inference";
import { PositionedModuleScope } from "../type-graph/module-scope";
import { RestArgument, FunctionType } from "../type-graph/types/function-type";
import { getDeclarationName, getAnonymousKey } from "./common";
import {
  getParentForNode,
  getScopeFromNode,
  findNearestTypeScope
} from "../utils/scope-utils";
import type { Handler } from "./traverse";
import type { ModuleScope } from "../type-graph/module-scope";
import type {
  Node,
  Identifier,
  FunctionDeclaration,
  ClassMethod,
  ClassProperty
} from "@babel/core";

export function addFunctionScopeToTypeGraph(
  currentNode: Node,
  parentNode: Node | VariableScope | ModuleScope,
  moduleScope: ModuleScope,
  variableInfo:
    | VariableInfo<FunctionType>
    | VariableInfo<GenericType<FunctionType>>
) {
  const scope = getScopeFromNode(
    currentNode,
    parentNode,
    moduleScope,
    variableInfo
  );
  scope.throwable = [];
  moduleScope.scopes.set(VariableScope.getName(currentNode), scope);
  if (currentNode.type === NODE.FUNCTION_EXPRESSION && currentNode.id) {
    // $FlowIssue In Flow VariableInfo<ObjectType> is incompatible with VariableInfo<Type> even if you don't mutate argument
    scope.body.set(getDeclarationName(currentNode), variableInfo);
  }
  return scope;
}

export function addFunctionNodeToTypeGraph(
  currentNode: FunctionDeclaration | ClassMethod | ClassProperty,
  parentNode: Node,
  moduleScope: ModuleScope
) {
  const name = getDeclarationName(currentNode);
  const currentScope = getParentForNode(currentNode, parentNode, moduleScope);
  currentScope.body.set(name, currentNode);
}

export function addFunctionToTypeGraph(
  currentNode: Node,
  parentNode: Node,
  moduleScope: ModuleScope | PositionedModuleScope,
  pre: Handler,
  middle: Handler,
  post: Handler,
  isTypeDefinitions: boolean
): VariableInfo<FunctionType> | VariableInfo<GenericType<FunctionType>> {
  const name =
    currentNode.type === NODE.FUNCTION_DECLARATION ||
    currentNode.type === NODE.TS_FUNCTION_DECLARATION
      ? getDeclarationName(currentNode)
      : getAnonymousKey(currentNode);
  const variableInfo:
    | VariableInfo<FunctionType>
    | VariableInfo<GenericType<FunctionType>> = (addVariableToGraph(
    currentNode,
    parentNode,
    moduleScope,
    pre,
    middle,
    post,
    name
  ): any);
  variableInfo.isInferenced = currentNode.returnType === undefined;
  variableInfo.meta.isAnonymous =
    currentNode.type !== NODE.FUNCTION_DECLARATION &&
    currentNode.type !== NODE.TS_FUNCTION_DECLARATION;
  const currentTypeScope = findNearestTypeScope(
    variableInfo.parent,
    moduleScope
  );
  const scope = isTypeDefinitions
    ? new VariableScope(VariableScope.FUNCTION_TYPE, variableInfo.parent)
    : addFunctionScopeToTypeGraph(
        currentNode,
        parentNode,
        moduleScope,
        variableInfo
      );
  variableInfo.type = (inferenceTypeForNode(
    currentNode,
    currentTypeScope,
    variableInfo.parent,
    moduleScope,
    parentNode,
    pre,
    middle,
    post,
    isTypeDefinitions
  ): any);
  const expected = currentNode.expected;
  let expectedType =
    expected instanceof GenericType ? expected.subordinateType : expected;
  if (expectedType instanceof UnionType) {
    expectedType = expectedType.variants.find(a => {
      a = a instanceof GenericType ? a.subordinateType : a;
      return a instanceof FunctionType;
    });
    expectedType =
      expectedType instanceof GenericType
        ? expectedType.subordinateType
        : expectedType;
  }
  let functionType =
    variableInfo.type instanceof GenericType
      ? variableInfo.type.subordinateType
      : variableInfo.type;
  let genericArgumentsTypes =
    variableInfo.type instanceof GenericType
      ? variableInfo.type.genericArguments
      : [];
  if (expected instanceof GenericType) {
    genericArgumentsTypes = [
      ...genericArgumentsTypes,
      ...expected.genericArguments
    ];
  }
  if (expectedType instanceof FunctionType) {
    const inferencedArgumentsTypes = functionType.argumentsTypes;
    const expectedArgumentsTypes = expectedType.argumentsTypes;
    const argumentsTypes = Array.from({
      length: Math.max(
        inferencedArgumentsTypes.length,
        expectedArgumentsTypes.length
      )
    });
    let wereArgumentsChanged = false;
    const newArgumentsTypes = argumentsTypes.reduce((res, _, i) => {
      const expectedArgumentType = expectedArgumentsTypes[i];
      const inferencedArgumentType = inferencedArgumentsTypes[i];
      if (
        inferencedArgumentType instanceof TypeVar &&
        !inferencedArgumentType.isUserDefined &&
        expectedArgumentType !== undefined
      ) {
        wereArgumentsChanged = true;
        return [...res, expectedArgumentType];
      }
      if (inferencedArgumentType !== undefined) {
        return [...res, inferencedArgumentType];
      }
      return res;
    }, []);
    const newReturnType =
      functionType.returnType instanceof TypeVar &&
      !functionType.returnType.isUserDefined &&
      expectedType.returnType.parent.priority <= 1
        ? expectedType.returnType
        : functionType.returnType;
    if (wereArgumentsChanged || newReturnType !== functionType.returnType) {
      const functionTypeName = FunctionType.getName(
        newArgumentsTypes,
        newReturnType,
        genericArgumentsTypes,
        currentNode.async,
        functionType.throwable
      );
      functionType = FunctionType.term(
        functionTypeName,
        {},
        newArgumentsTypes,
        newReturnType
      );
      variableInfo.isInferenced = false;
      variableInfo.type =
        genericArgumentsTypes.length > 0
          ? GenericType.new(
              functionTypeName,
              {},
              genericArgumentsTypes,
              // $FlowIssue
              variableInfo.type.localTypeScope,
              functionType
            )
          : functionType;
    }
  }
  const withPositions = moduleScope instanceof PositionedModuleScope;
  const argumentsTypes: Array<Type> = (functionType: any).argumentsTypes;
  currentNode.params.forEach((param, index) => {
    let type = argumentsTypes[index];
    if (type === undefined) {
      type = argumentsTypes[argumentsTypes.length - 1];
      if (!(type instanceof RestArgument)) {
        type = Type.Undefined;
      }
    }
    const id = param.left || param.argument || param;
    if (param.left != undefined && type instanceof UnionType) {
      const types = type.variants.filter(a => a !== Type.Undefined);
      type = UnionType.term(null, { parent: currentTypeScope }, types);
    }
    if (type instanceof RestArgument) {
      if (param.argument != undefined) {
        type = type.type;
      } else {
        type = type.type.getPropertyType(index);
      }
    }
    let varInfo = scope.body.get(id.name);
    /*::if (type == undefined) return*/
    if (varInfo !== undefined) {
      varInfo.type = type;
      varInfo.parent = scope;
    } else {
      varInfo = new VariableInfo(type, scope, new Meta(id.loc));
      scope.body.set(id.name, varInfo);
    }
    if (withPositions) {
      // $FlowIssue
      moduleScope.addPosition(id, varInfo);
    }
  });
  if (withPositions && currentNode.id != null) {
    // $FlowIssue
    moduleScope.addPosition(currentNode.id, variableInfo);
  }
  return variableInfo;
}

export function isCallableType(a: Type) {
  if (a instanceof GenericType) {
    a = a.subordinateType;
  }
  return a instanceof FunctionType;
}

export function isSideEffectCall(node: Node, invocationResult: Type) {
  return (
    node.type === NODE.EXPRESSION_STATEMENT && // i.e we don't assign a return value of it to any variable
    node.expression != null && //
    (node.expression.type === NODE.CALL_EXPRESSION || // if we call a function like a side effect.
      node.expression.type === NODE.TAGGED_TEMPLATE_EXPRESSION) && // if we call a function as tag like a side effect.
    !invocationResult.equalsTo(Type.Undefined) && // but call of this function actually return something.
    !invocationResult.equalsTo(Type.Undefined.promisify()) // but call of this function actually return something.
  );
}

export function functionWithReturnType(
  functionType: GenericType<FunctionType> | FunctionType,
  newReturnType: Type
) {
  const oldFunctionType =
    functionType instanceof GenericType
      ? functionType.subordinateType
      : functionType;
  const newFunctionArguments = [...oldFunctionType.argumentsTypes];
  const newFunctionGenericArguments =
    functionType instanceof GenericType
      ? [...functionType.genericArguments]
      : [];
  const newFunctionType = FunctionType.term(
    FunctionType.getName(
      newFunctionArguments,
      newReturnType,
      newFunctionGenericArguments,
      oldFunctionType.isAsync
    ),
    {},
    newFunctionArguments,
    newReturnType
  );
  if (
    !(functionType instanceof GenericType) ||
    newFunctionType instanceof GenericType
  ) {
    return newFunctionType;
  }
  return GenericType.new(
    newFunctionType.name,
    {},
    newFunctionGenericArguments,
    functionType.localTypeScope,
    newFunctionType
  );
}
