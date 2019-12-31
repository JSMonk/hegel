// @flow
import NODE from "./nodes";
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
import type { Node, ClassDeclaration, ClassExpression, ClassProperty, ObjectProperty, ClassMethod, ObjectMethod, ObjectExpression } from "@babel/core";

export function addClassScopeToTypeGraph(
  currentNode: ClassDeclaration | ClassExpression | ObjectExpression,
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
  const name = currentNode.id != undefined ? getDeclarationName(currentNode) : "{ }";
  const Object = findVariableInfo({ name: "Object" }, typeScope);
  const selfObject = new ObjectType(
    name,
    [],
    {
      isSubtypeOf: Object.type,
      isNominal: currentNode.type === NODE.CLASS_EXPRESSION || currentNode.type === NODE.CLASS_DECLARATION
    }
  );
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
  currentNode: ClassDeclaration | ClassExpression,
  parentNode: Node,
  typeScope: Scope,
  typeGraph: ModuleScope,
) {
  const currentScope = getParentForNode(currentNode, parentNode, typeGraph);
  addClassScopeToTypeGraph(currentNode, currentScope, typeScope, typeGraph);
  if (currentNode.type !== NODE.CLASS_DECLARATION) {
    return;
  }
  const name = getDeclarationName(currentNode);
  currentScope.body.set(name, currentNode);
}

export function addPropertyNodeToThis(
  currentNode: ClassProperty | ObjectProperty | ClassMethod | ObjectMethod,
  parentNode: Node,
  typeGraph: ModuleScope,
) {
  const propertyName = currentNode.key.name || `${currentNode.key.value}`;
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

export function addObjectName(currentNode: ObjectExpression, typeGraph: ModuleScope) {
  const objectScope = typeGraph.body.get(Scope.getName(currentNode));
  if (!(objectScope instanceof Scope)) {
    throw new Error("Never!!!");
  }
  const self = objectScope.body.get(THIS_TYPE);
  if (!(self instanceof VariableInfo)) {
    throw new Error("Never!!!");
  }
  // $FlowIssue
  const selfType: ObjectType = self.type instanceof GenericType ? self.type.subordinateType : self.type;
  selfType.name = ObjectType.getName([...selfType.properties], selfType) || selfType.name;
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
  properties.delete(CONSTRUCTABLE, constructor);
  const classVariable = new VariableInfo(new ObjectType(String(self.type.name), [[CONSTRUCTABLE, constructor]]), parentScope);
  parentScope.body.set(name, classVariable);
  // $FlowIssue
  typeScope.body.set(name, self);
};
