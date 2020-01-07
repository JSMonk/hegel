// @flow
import NODE from "./nodes";
import HegelError from "./errors";
import { Meta } from "../type-graph/meta/meta";
import { Scope } from "../type-graph/scope";
import { CallMeta } from "../type-graph/meta/call-meta";
import { ObjectType } from "../type-graph/types/object-type";
import { GenericType } from "../type-graph/types/generic-type";
import { FunctionType } from "../type-graph/types/function-type";
import { VariableInfo } from "../type-graph/variable-info";
import { addCallToTypeGraph } from "../type-graph/call";
import { getTypeFromTypeAnnotation } from "./type-utils";
import { THIS_TYPE, TYPE_SCOPE, CONSTRUCTABLE } from "../type-graph/constants";
import {
  findVariableInfo,
  getDeclarationName,
  getAnonymousKey
} from "./common";
import {
  getParentForNode,
  getScopeFromNode,
  findNearestTypeScope
} from "../utils/scope-utils";
import type { Handler } from "./traverse";
import type { ModuleScope } from "../type-graph/module-scope";
import type {
  Node,
  ClassDeclaration,
  ClassExpression,
  ClassProperty,
  ObjectProperty,
  ClassMethod,
  ObjectMethod,
  ObjectExpression
} from "@babel/core";

export function addThisToClassScope(
  currentNode: ClassDeclaration | ClassExpression | ObjectExpression,
  parentNode: Node,
  typeScope: Scope,
  typeGraph: ModuleScope,
  precompute: Handler,
  middlecompute: Handler,
  postcompute: Handler
) {
  parentNode = currentNode.parentNode;
  const classScope = typeGraph.body.get(Scope.getName(currentNode));
  if (!(classScope instanceof Scope)) {
    throw new Error("Never!!!");
  }
  const parentTypeScope = findNearestTypeScope(classScope, typeGraph);
  const name =
    currentNode.id != undefined ? getDeclarationName(currentNode) : "{ }";
  const Object = findVariableInfo({ name: "Object" }, typeScope);
  const selfObject = new ObjectType(name, [], {
    isSubtypeOf: Object.type,
    isNominal:
      currentNode.type === NODE.CLASS_EXPRESSION ||
      currentNode.type === NODE.CLASS_DECLARATION
  });
  const localTypeScope = new Scope(Scope.BLOCK_TYPE, parentTypeScope);
  const self =
    currentNode.typeParameters === undefined
      ? selfObject
      : new GenericType(
          name,
          currentNode.typeParameters.params.map(typeAnnotation =>
            getTypeFromTypeAnnotation(
              { typeAnnotation },
              localTypeScope,
              classScope.parent,
              true,
              null,
              parentNode,
              typeGraph,
              precompute,
              middlecompute,
              postcompute
            )
          ),
          localTypeScope,
          selfObject
        );
  if (currentNode.superClass != null) {
    let superClass =  addCallToTypeGraph(
        currentNode.superClass,
        typeGraph,
        classScope.parent,
        parentNode,
        precompute,
        middlecompute,
        postcompute,
      ).result;
    superClass = superClass instanceof VariableInfo ? superClass.type : superClass;
    if (!(superClass instanceof ObjectType && superClass.instanceType !== null)) {
      throw new HegelError("Cannot extend class from non-class type", currentNode.superClass.loc);
    }
    const superType = superClass.instanceType;
    if (superType instanceof GenericType && currentNode.superTypeParameters == null) {
      throw new HegelError(
        `Generic type "${String(
          superType.name
        )}" should be used with type paramteres!`,
        currentNode.superClass.loc
      );
    }
    const genericParams = (currentNode.superTypeParameters || []).map(arg =>
      getTypeFromTypeAnnotation(
        { typeAnnotation: arg },
        typeScope,
        localTypeScope,
        true,
        null,
        parentNode,
        typeGraph,
        precompute,
        middlecompute,
        postcompute
      )
    );
    selfObject.isSubtypeOf = superType instanceof GenericType ?
      superType.applyGeneric(genericParams, currentNode.superClass.loc) 
      : superClass.instanceType;
  }
  const selfVar = new VariableInfo(self, classScope);
  classScope.body.set(THIS_TYPE, selfVar);
  parentTypeScope.body.set(name, selfVar);
}

function addThisToObjectScope(objectScope: Scope, typeScope: Scope) {
  const Object = findVariableInfo({ name: "Object" }, typeScope);
  const self = new ObjectType("{ }", [], { isSubtypeOf: Object.type });
  const selfVar = new VariableInfo(self, objectScope);
  objectScope.body.set(THIS_TYPE, selfVar);
}

export function addClassScopeToTypeGraph(
  currentNode: ClassDeclaration | ClassExpression | ObjectExpression,
  parentNode: Node,
  typeGraph: ModuleScope,
) {
  const scope = getScopeFromNode(currentNode, parentNode, typeGraph);
  const parentTypeScope = findNearestTypeScope(scope, typeGraph);
  const name =
    currentNode.id != undefined
      ? getDeclarationName(currentNode)
      : getAnonymousKey(currentNode);
  parentTypeScope.body.set(name, currentNode);
  typeGraph.body.set(Scope.getName(currentNode), scope);
  if (scope.type === Scope.OBJECT_TYPE) {
    // $FlowIssue
    addThisToObjectScope(scope, typeGraph.body.get(TYPE_SCOPE));
  } else {
    scope.body.set(THIS_TYPE, { type: NODE.THIS_TYPE_DEFINITION, parentNode, definition: currentNode, loc: currentNode.loc });
  }
  return scope;
}

export function addClassNodeToTypeGraph(
  currentNode: ClassDeclaration | ClassExpression,
  parentNode: Node,
  typeGraph: ModuleScope,
) {
  const name =
    currentNode.id != undefined
      ? getDeclarationName(currentNode)
      : getAnonymousKey(currentNode);
  const currentScope = getParentForNode(currentNode, parentNode, typeGraph);
  if (currentScope.body.has(name)) {
    return;
  }
  addClassScopeToTypeGraph(currentNode, parentNode, typeGraph);
  if (currentNode.type !== NODE.CLASS_DECLARATION) {
    return;
  }
  currentScope.body.set(name, currentNode);
}

export function addPropertyNodeToThis(
  currentNode: ClassProperty | ObjectProperty | ClassMethod | ObjectMethod,
  parentNode: Node,
  typeGraph: ModuleScope,
  pre: Handler,
  middle: Handler,
  post: Handler,
) {
  const propertyName = currentNode.key.name || `${currentNode.key.value}`;
  const currentClassScope = getParentForNode(
    currentNode,
    parentNode,
    typeGraph
  );
  if (currentClassScope.declaration !== undefined) {
    return;
  }
  const self = findVariableInfo(
    { name: THIS_TYPE },
    currentClassScope,
    parentNode,
    typeGraph,
    pre,
    middle,
    post
  );
  const selfType =
    self.type instanceof GenericType ? self.type.subordinateType : self.type;
  if (!(selfType instanceof ObjectType)) {
    throw new Error("Never!!!");
  }
  if (selfType.properties.has(propertyName)) {
    throw new HegelError("Duplicated property definition!", currentNode.loc);
  }
  selfType.properties.set(propertyName, currentNode);
}

export function addObjectName(
  currentNode: ObjectExpression,
  typeGraph: ModuleScope
) {
  const objectScope = typeGraph.body.get(Scope.getName(currentNode));
  if (!(objectScope instanceof Scope)) {
    throw new Error("Never!!!");
  }
  const self = objectScope.body.get(THIS_TYPE);
  if (!(self instanceof VariableInfo)) {
    throw new Error("Never!!!");
  }
  // $FlowIssue
  const selfType: ObjectType =
    self.type instanceof GenericType ? self.type.subordinateType : self.type;
  selfType.name =
    ObjectType.getName([...selfType.properties], selfType) || selfType.name;
}

export function addClassToTypeGraph(
  classNode: Node,
  typeScope: Scope,
  typeGraph: ModuleScope,
  parentNode: Node,
  pre: Handler,
  middle: Handler,
  post: Handler,
  isTypeDefinitions: boolean
) {
  const classScope = typeGraph.body.get(Scope.getName(classNode));
  const name =
    classNode.id != undefined
      ? getDeclarationName(classNode)
      : getAnonymousKey(classNode);
  if (!(classScope instanceof Scope)) {
    throw new Error("Never!!!");
  }
  const parentScope = classScope.parent;
  const self = findVariableInfo(
    { name: THIS_TYPE },
    classScope,
    parentNode,
    typeGraph,
    pre,
    middle,
    post
  );
  // $FlowIssue
  const { properties } =
    self.type instanceof GenericType ? self.type.subordinateType : self.type;
  if (self.type.name === "{ }") {
    self.type.name = ObjectType.getName([...properties]);
  }
  const errors = [];
  // properties.forEach((property, key) => {
  //  if (!property.hasInitializer && property.type.name !== "undefined") {
  //    errors.push(new HegelError(`Property "${key}" has a type, but doesn't have an initializer!`, property.meta.loc));
  //  }
  // });
  if (errors.length !== 0) {
    throw errors;
  }

  const constructor = properties.get("constructor") ||
    new VariableInfo(new FunctionType("", [], self.type), classScope);
  properties.delete("constructor");
  const object = findVariableInfo({ name: "Object" }, typeScope).type;
  const type =
    constructor.type instanceof GenericType
      ? constructor.type.subordinateType
      : constructor.type;
  type.returnType = object.isPrincipalTypeFor(type.returnType)
    ? type.returnType
    : self.type;
  constructor.type = type;
  if (constructor.type.name !== "" && !isTypeDefinitions) {
    const constructorScope = typeGraph.body.get(
      Scope.getName(constructor.meta)
    );
    if (!(constructorScope instanceof Scope)) {
      throw new Error("Never!!!");
    }
    if (
      constructorScope.calls.find(call => call.targetName === "return") ===
      undefined
    ) {
      const callMeta = new CallMeta(
        new FunctionType("", [self.type], self.type),
        [self],
        constructor.meta.loc,
        "return",
        false
      );
      constructorScope.calls.push(callMeta);
    }
  }
  properties.delete(CONSTRUCTABLE, constructor);
  const staticType = new ObjectType(classNode.id ? name : "Anonymous Class", [[CONSTRUCTABLE, constructor]]);
  staticType.instanceType = self.type;
  const classVariable = new VariableInfo(staticType, parentScope, new Meta(classNode.loc));
  parentScope.body.set(name, classVariable);
  classScope.declaration = classVariable;
  // $FlowIssue
  typeScope.body.set(name, self);
}
