// @flow
import NODE from "./nodes";
import HegelError from "./errors";
import traverseTree from "../utils/traverse";
import { Scope } from "../type-graph/scope";
import { VariableInfo } from "../type-graph/variable-info";
import type { Handler } from "./traverse";
import type { Type } from "../type-graph/types/type";
import type { ModuleScope } from "../type-graph/module-scope";
import type {
  Node,
  Declaration,
  SourceLocation,
  MemberExpression,
  ClassDeclaration,
  FunctionDeclaration,
} from "@babel/parser";

export const getAnonymousKey = (node: Node) =>
  `[[Anonymuos${node.loc.start.line}-${node.loc.start.column}]]`;

export const getDeclarationName = (node: Declaration): string => node.id.name;

type Identifier = {
  name: string,
  loc?: SourceLocation
};

function canTraverseFunction(rest: [] | [Node, ModuleScope, Handler, Handler, Handler]) {
  return rest.length === 5;
}

export function findVariableInfo(
  { name, loc }: Identifier,
  parentContext: ModuleScope | Scope,
  ...rest: [] | [Node, ModuleScope, Handler, Handler, Handler]
): VariableInfo  {
  let parent = parentContext;
  do {
    const variableInfo = parent.body.get(name);
    if (variableInfo) {
      if(variableInfo instanceof VariableInfo) {
        if ("subordinateMagicType" in variableInfo.type && name !== ".") {
          const newType = (variableInfo.type: any).unpack();
          variableInfo.type = newType;
        }
        return variableInfo;
      }
      if (!(variableInfo instanceof Scope) && canTraverseFunction(rest)) {
        // $FlowIssue
        return addAndTraverseFunctionWithType(
          undefined,
          variableInfo,
          ...rest
        );
      }
    }
    parent = parent.parent;
  } while (parent);
  throw new HegelError(`Variable "${name}" is not defined!`, loc);
}

export function addAndTraverseFunctionWithType(
  definedType: ?Type,
  currentNode: Node,
  parentNode: Node,
  typeGraph: ModuleScope,
  precompute: Handler,
  middlecompute: Handler,
  postcompute: Handler
) {
  currentNode.expected =
    definedType != undefined && 'variants' in definedType
      // $FlowIssue
      ? definedType.variants.find(a => 'argumentsTypes' in a)
      : definedType;
  const scopeName = Scope.getName(currentNode);
  traverseTree(currentNode, precompute, middlecompute, postcompute, parentNode);
  const scope = typeGraph.body.get(scopeName);
  if (!(scope instanceof Scope)) {
    throw new Error("Never!!!");
  }
  const declaration = scope.declaration;
  if (!(declaration instanceof VariableInfo)) {
    throw new Error("Never!!!");
  }
  return declaration;
}

export function findFunctionOrClass(
  node: Identifier,
  parentContext: ModuleScope | Scope,
  parentNode: Node,
  typeGraph: ModuleScope,
  precompute: Handler,
  middlecompute: Handler,
  postcompute: Handler
) {
  const variableOrNode = findRecordInfo(node, parentContext);
  if (variableOrNode instanceof VariableInfo) {
    return variableOrNode;
  }
  return addAndTraverseFunctionWithType(
    undefined,
    variableOrNode,
    parentNode,
    typeGraph,
    precompute,
    middlecompute,
    postcompute
  );
}

export function findRecordInfo(
  { name, loc }: Identifier,
  parentContext: ModuleScope | Scope
): VariableInfo | ClassDeclaration | FunctionDeclaration  {
  let parent = parentContext;
  do {
    const recordInfo = parent.body.get(name);
    if (recordInfo && !(recordInfo instanceof Scope)) {
      return recordInfo;
    }
    parent = parent.parent;
  } while (parent);
  throw new HegelError(`Record "${name}" is not defined!`, loc);
}

function analyze(context: ?Scope, name: string) {
  if (context == undefined) {
    return;
  }
  const variableInfo = context.body.get(name);
  if (variableInfo && variableInfo instanceof VariableInfo) {
    if ("subordinateMagicType" in variableInfo.type && name !== ".") {
      const newType = (variableInfo.type: any).unpack();
      variableInfo.type = newType;
    }
    return variableInfo;
  }
}

type ValidKey<T> = string | number | T;

export function unique<T>(
  arr: Array<T>,
  getKey: T => ValidKey<T> = x => x
): Array<T> {
  const filterObject: { [key: ValidKey<T>]: T } = {};
  for (let i = 0; i < arr.length; i++) {
    const key = getKey(arr[i]);
    filterObject[key] = arr[i];
  }
  return (Object.values(filterObject): any);
}

export function intersection<T>(
  arr1: Array<T>,
  arr2: Array<T>,
  isEquals: (T, T) => boolean = (a, b) => a === b
): [Array<T>, Array<T>] {
  const intersectionResult = [];
  const exclusiveOr = [];
  for (let i = 0; i < arr1.length; i++) {
    for (let j = 0; j < arr2.length; j++) {
      if (!isEquals(arr1[i], arr2[j])) {
        exclusiveOr.push(arr1[i], arr2[j]);
        continue;
      }
      intersectionResult.push(arr2[j]);
    }
  }
  return [intersectionResult, exclusiveOr];
}

export function union<T>(
  arr1: Array<T>,
  arr2: Array<T>,
  isEquals: (T, T) => boolean = (a, b) => a === b
): Array<T> {
  const unionResult = [];
  for (let i = 0; i < arr1.length; i++) {
    for (let j = 0; j < arr2.length; j++) {
      if (isEquals(arr1[i], arr2[j])) {
        unionResult.push(arr2[j]);
        continue;
      }
      unionResult.push(arr2[j]);
    }
  }
  return unionResult;
}

export function getMemberExressionTarget(node: MemberExpression): Node {
  let target = node;
  do {
    target = target.object;
  } while (target.type === NODE.MEMBER_EXPRESSION);
  return target;
}
