// @flow
import HegelError from "./errors";
import { Scope } from "../type-graph/scope";
import { CallMeta } from "../type-graph/meta/call-meta";
import { ObjectType } from "../type-graph/types/object-type";
import { GenericType } from "../type-graph/types/generic-type";
import { FunctionType } from "../type-graph/types/function-type";
import { VariableInfo } from "../type-graph/variable-info";
import { findVariableInfo } from "../utils/common";
import { getDeclarationName } from "./common";
import { THIS_TYPE, CONSTRUCTABLE } from "../type-graph/constants";
import { getTypeFromTypeAnnotation } from "./type-utils";
import { getParentForNode, getScopeFromNode, findNearestTypeScope } from "../utils/scope-utils";
import type { Handler } from "./traverse";
import type { ModuleScope } from "../type-graph/module-scope";
import type { Node, ClassDeclaration, ClassExpression, ClassProperty, ObjectProperty, ClassMethod, ObjectMethod } from "@babel/core";

export function addClassScopeToTypeGraph(
  currentNode: ClassDeclaration | ClassExpression,
  parentNode: Node | Scope | ModuleScope,
  typeScope: Scope,
  typeGraph: ModuleScope
) {
  const scope = getScopeFromNode(
    currentNode,
    parentNode,
    typeGraph,
  );
  const parentTypeScope = findNearestTypeScope(scope, typeGraph);
  const name = getDeclarationName(currentNode);
  const Object = findVariableInfo({ name: "Object" }, typeScope);
  const selfObject = new ObjectType(name, [], { isSubtypeOf: Object.type, isNominal: true });
  const localTypeScope = new Scope(Scope.BLOCK_TYPE, parentTypeScope);
  const self = currentNode.typeParameters === undefined ? selfObject : new GenericType(
    name,
    currentNode.typeParameters.params.map(typeAnnotation =>
      getTypeFromTypeAnnotation(
        { typeAnnotation },
        localTypeScope,
        scope.parent
      )
    ),
    localTypeScope,
    selfObject
  );
  scope.body.set(THIS_TYPE, new VariableInfo(self, scope));
  typeGraph.body.set(Scope.getName(currentNode), scope);
  return scope;
}

export function addClassNodeToTypeGraph(
  currentNode: ClassDeclaration,
  parentNode: Node,
  typeScope: Scope,
  typeGraph: ModuleScope,
) {
  const name = getDeclarationName(currentNode);
  const currentScope = getParentForNode(currentNode, parentNode, typeGraph);
  addClassScopeToTypeGraph(currentNode, currentScope, typeScope, typeGraph);
  currentScope.body.set(name, currentNode);
}

export function addPropertyNodeToThis(
  currentNode: ClassProperty | ObjectProperty | ClassMethod | ObjectMethod,
  parentNode: Node,
  typeGraph: ModuleScope,
) {
  const propertyName = currentNode.key.name;
  const currentClassScope = getParentForNode(currentNode, parentNode, typeGraph);
  const self = findVariableInfo({ name: THIS_TYPE }, currentClassScope);
  const selfType = self.type instanceof GenericType ? self.type.subordinateType : self.type;
  if (!(selfType instanceof ObjectType)) {
    throw new Error("Never!!!");
  }
  if (selfType.properties.has(propertyName)) {
    throw new HegelError("Duplicated property definition!", currentNode.loc);
  }
  selfType.properties.set(propertyName, currentNode);
}

export function addClassToTypeGraph(
  classNode: Node,
  typeScope: Scope,
  typeGraph: ModuleScope,
  parentNode: Node,
  pre: Handler,
  middle: Handler,
  post: Handler
) {
  const classScope = typeGraph.body.get(Scope.getName(classNode));
  const name = getDeclarationName(classNode);
  if (!(classScope instanceof Scope)) {
    throw new Error("Never!!!");
  }
  const parentScope = classScope.parent;
  const self = classScope.body.get(THIS_TYPE);
  if (!(self instanceof VariableInfo)) {
    throw new Error("Never!!!");
  }
  // $FlowIssue
  const { properties } = self.type instanceof GenericType ? self.type.subordinateType : self.type;
  const errors = [];
  // properties.forEach((property, key) => {
  //  if (!property.hasInitializer && property.type.name !== "undefined") {
  //    errors.push(new HegelError(`Property "${key}" has a type, but doesn't have an initializer!`, property.meta.loc));
  //  }
  // });
  if (errors.length !== 0) {
    throw errors;
  }
  
  const constructor = properties.get("constructor") || { type: new FunctionType("", [], self.type) };
  properties.delete("constructor");
  const object = findVariableInfo({ name: "Object" }, typeScope).type;
  const type = constructor.type instanceof GenericType ? constructor.type.subordinateType : constructor.type;
  type.returnType = object.isPrincipalTypeFor(type.returnType) ? type.returnType : self.type;
  if (constructor instanceof VariableInfo) {
    const constructorScope = typeGraph.body.get(Scope.getName(constructor.meta));
    if (!(constructorScope instanceof Scope)) {
      throw new Error("Never!!!");
    }
    if (constructorScope.calls.find(call => call.targetName === "return") === undefined) {
    const callMeta = new CallMeta(
      constructor,
      [self],
      constructor.meta.loc,
      "return",
      false
    );
    constructorScope.calls.push(callMeta);
    }
  }
  const classType = self;
  // $FlowIssue
  const classVariable = new VariableInfo(new ObjectType(self.type.name, [[CONSTRUCTABLE, constructor]]), parentScope);
  properties.delete(CONSTRUCTABLE, constructor);
  parentScope.body.set(name, classVariable);
  typeScope.body.set(name, classType);
};
