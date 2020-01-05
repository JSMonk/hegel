// @flow
import { Meta } from "../type-graph/meta/meta";
import { Type } from "../type-graph/types/type";
import { UnionType } from "../type-graph/types/union-type";
import { TupleType } from "../type-graph/types/tuple-type";
import { ObjectType } from "../type-graph/types/object-type";
import { addPosition } from "./position-utils";
import { FunctionType } from "../type-graph/types/function-type";
import { VariableInfo } from "../type-graph/variable-info";
import { UNDEFINED_TYPE } from "../type-graph/constants";
import { getDeclarationName } from "./common";
import { getTypeFromTypeAnnotation } from "./type-utils";
import { getParentForNode, findNearestTypeScope } from "./scope-utils";
import type { Node } from "@babel/parser";
import type { Scope } from "../type-graph/scope";
import type { Handler } from "./traverse";
import type { ModuleScope } from "../type-graph/module-scope";

export function getVariableInfoFromDelcaration(
  currentNode: Node,
  parentNode: Node,
  typeGraph: ModuleScope,
  precompute: Handler,
  middlecompute: Handler,
  postcompute: Handler
) {
  const parentScope = getParentForNode(currentNode, parentNode, typeGraph);
  const currentTypeScope = findNearestTypeScope(parentScope, typeGraph);
  const annotatedType = getTypeFromTypeAnnotation(
    currentNode.id && currentNode.id.typeAnnotation,
    currentTypeScope,
    parentScope,
    false,
    null,
    parentNode,
    typeGraph,
    precompute,
    middlecompute,
    postcompute
  );
  return new VariableInfo(
    annotatedType,
    parentScope,
    new Meta(currentNode.loc),
    currentNode.kind === "const"
  );
}

export function getSuperTypeOf(type: Type, typeScope: Scope): Type {
  if (
    !type.isSubtypeOf ||
    type.name === null ||
    type.name === "undefined" ||
    type instanceof FunctionType ||
    type instanceof TupleType ||
    type instanceof UnionType ||
    (type instanceof ObjectType && String(type.name)[0] !== "{")
  ) {
    return type;
  }
  if (type instanceof ObjectType) {
    const propertyTypes = [...type.properties.entries()].map(([key, v]) => [
      key,
      v.type
    ]);
    const newProperties = propertyTypes.map(([key, p]) => [
      key,
      // $FlowIssue
      Object.assign(type.properties.get(key), {
        type: getSuperTypeOf(p, typeScope)
      })
    ]);
    return ObjectType.createTypeWithName(
      ObjectType.getName(newProperties),
      typeScope,
      newProperties
    );
  }
  return type.isSubtypeOf;
}

export function getVariableType(
  variable: ?VariableInfo,
  newType: Type,
  typeScope: Scope,
  inferenced: boolean = false
): Type {
  if (variable && variable.type.name !== UNDEFINED_TYPE) {
    return variable.type;
  }
  if (!inferenced) {
    return newType;
  }
  return getSuperTypeOf(newType, typeScope);
}

export function addVariableToGraph(
  currentNode: Node,
  parentNode: ?Node,
  typeGraph: ModuleScope,
  precompute: Handler,
  middlecompute: Handler,
  postcompute: Handler,
  customName?: string = getDeclarationName(currentNode)
) {
  const variableInfo = getVariableInfoFromDelcaration(
    currentNode,
    parentNode,
    typeGraph,
    precompute,
    middlecompute,
    postcompute
  );
  variableInfo.parent.body.set(customName, variableInfo);
  if (currentNode.id != null) {
    addPosition(currentNode.id, variableInfo, typeGraph);
  }
  return variableInfo;
}
