// @flow
import NODE from "./nodes";
import HegelError from "./errors";
import { Meta } from "../type-graph/meta/meta";
import { CallMeta } from "../type-graph/meta/call-meta";
import { TypeScope } from "../type-graph/type-scope";
import { ObjectType } from "../type-graph/types/object-type";
import { GenericType } from "../type-graph/types/generic-type";
import { FunctionType } from "../type-graph/types/function-type";
import { VariableInfo } from "../type-graph/variable-info";
import { VariableScope } from "../type-graph/variable-scope";
import { addCallToTypeGraph } from "../type-graph/call";
import { functionWithReturnType } from "./function-utils";
import { getTypeFromTypeAnnotation } from "./type-utils";
import { THIS_TYPE, CONSTRUCTABLE } from "../type-graph/constants";
import { getAnonymousKey, getDeclarationName } from "./common";
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
  typeScope: TypeScope,
  typeGraph: ModuleScope,
  precompute: Handler,
  middlecompute: Handler,
  postcompute: Handler
) {
  parentNode = currentNode.parentNode;
  currentNode = currentNode.definition;
  const classScope = typeGraph.body.get(VariableScope.getName(currentNode));
  if (!(classScope instanceof VariableScope)) {
    throw new Error("Never!!!");
  }
  if (classScope.declaration !== undefined) {
    return;
  }
  const parentTypeScope = findNearestTypeScope(classScope, typeGraph);
  const name =
    currentNode.id != undefined ? getDeclarationName(currentNode) : "{ }";
  const selfObject = ObjectType.term(
    name,
    {
      isNominal:
        currentNode.type === NODE.CLASS_EXPRESSION ||
        currentNode.type === NODE.CLASS_DECLARATION
    },
    []
  );
  const localTypeScope = new TypeScope(parentTypeScope);
  const self =
    currentNode.typeParameters === undefined
      ? selfObject
      : GenericType.term(
          name,
          {},
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
    let superClass = addCallToTypeGraph(
      currentNode.superClass,
      typeGraph,
      classScope.parent,
      parentNode,
      precompute,
      middlecompute,
      postcompute
    ).result;
    superClass =
      superClass instanceof VariableInfo ? superClass.type : superClass;
    if (
      !(superClass instanceof ObjectType && superClass.instanceType !== null)
    ) {
      throw new HegelError(
        "Cannot extend class from non-class type",
        currentNode.superClass.loc
      );
    }
    const superType = superClass.instanceType;
    if (
      superType instanceof GenericType &&
      currentNode.superTypeParameters == null
    ) {
      throw new HegelError(
        `Generic type "${String(
          superType.name
        )}" should be used with type paramteres!`,
        currentNode.superClass.loc
      );
    }
    const superFunctionType = functionWithReturnType(
      // $FlowIssue
      superClass.properties.get(CONSTRUCTABLE).type,
      self
    );
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
    selfObject.isSubtypeOf =
      superType instanceof GenericType
        ? superType.applyGeneric(genericParams, currentNode.superClass.loc)
        : superClass.instanceType;
    classScope.body.set(
      "super",
      new VariableInfo(superFunctionType, classScope)
    );
  }
  const selfVar = new VariableInfo(self, classScope);
  classScope.body.set(THIS_TYPE, selfVar);
  if (
    currentNode.type === NODE.CLASS_EXPRESSION ||
    currentNode.type === NODE.CLASS_DECLARATION
  ) {
    parentTypeScope.body.set(name, selfVar);
    const staticName = getClassName(currentNode);
    const staticSelfObject = ObjectType.term(staticName, { isNominal: true }, []);
    const staticSelfVar = new VariableInfo(staticSelfObject, classScope.parent);
    classScope.parent.body.set(name, staticSelfVar);
    classScope.declaration = staticSelfVar;
    staticSelfObject.instanceType = self;
    const isConstructorPresented = currentNode.body.body.some(
      m => m.kind === "constructor"
    );
    if (!isConstructorPresented) {
      const constructor: VariableInfo =
        classScope.body.get("super") ||
        new VariableInfo(
          FunctionType.new(`() => ${name}`, {}, [], self),
          classScope,
          new Meta(currentNode.loc)
        );
      // $FlowIssue
      const type: FunctionType =
        constructor.type instanceof GenericType
          ? constructor.type.subordinateType
          : constructor.type;
      type.returnType = ObjectType.Object.isPrincipalTypeFor(type.returnType)
        ? type.returnType
        : self.type;
      constructor.type = type;
      staticSelfObject.properties.set(CONSTRUCTABLE, constructor);
    }
  }
}

function addThisToObjectScope(
  objectScope: VariableScope,
  currentNode: ObjectExpression
) {
  const properties =
    currentNode.expected instanceof ObjectType
      ? [...currentNode.expected.properties]
      : [];
  const self = new ObjectType("{  }", {}, properties);
  const selfVar = new VariableInfo(self, objectScope);
  objectScope.body.set(THIS_TYPE, selfVar);
}

export function addClassScopeToTypeGraph(
  currentNode: ClassDeclaration | ClassExpression | ObjectExpression,
  parentNode: Node,
  typeGraph: ModuleScope
) {
  const scope = getScopeFromNode(currentNode, parentNode, typeGraph);
  const parentTypeScope = findNearestTypeScope(scope, typeGraph);
  const name =
    currentNode.id != undefined
      ? getDeclarationName(currentNode)
      : getAnonymousKey(currentNode);
  parentTypeScope.body.set(name, currentNode);
  typeGraph.body.set(VariableScope.getName(currentNode), scope);
  if (scope.type === VariableScope.OBJECT_TYPE) {
    addThisToObjectScope(scope, currentNode);
  } else {
    currentNode.body.body.unshift({
      type: NODE.THIS_TYPE_DEFINITION,
      parentNode,
      definition: currentNode,
      loc: currentNode.loc
    });
  }
  return scope;
}

export function addPropertyNodeToThis(
  currentNode: ClassProperty | ObjectProperty | ClassMethod | ObjectMethod,
  parentNode: Node,
  typeGraph: ModuleScope,
  pre: Handler,
  middle: Handler,
  post: Handler
) {
  let propertyName = currentNode.key.name || `${currentNode.key.value}`;
  propertyName = propertyName === "constructor" ? CONSTRUCTABLE : propertyName;
  // $FlowIssue
  const currentClassScope: VariableScope = getParentForNode(
    currentNode,
    parentNode,
    typeGraph
  );
  if (currentClassScope.isProcessed) {
    return;
  }
  // $FlowIssue
  const self: VariableInfo = currentNode.static || propertyName === CONSTRUCTABLE
    ? currentClassScope.declaration
    : currentClassScope.findVariable(
        { name: THIS_TYPE },
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
  const existedProperty = selfType.properties.get(propertyName);
  if (
    existedProperty !== undefined &&
    (currentClassScope.type === VariableScope.CLASS_TYPE ||
      (existedProperty instanceof VariableInfo &&
        existedProperty.hasInitializer))
  ) {
    throw new HegelError("Duplicated property definition!", currentNode.loc);
  }
  if (!(existedProperty instanceof VariableInfo)) {
    selfType.properties.set(propertyName, currentNode);
  }
}

export function addObjectToTypeGraph(
  currentNode: ObjectExpression,
  typeGraph: ModuleScope
) {
  const objectScope = typeGraph.body.get(VariableScope.getName(currentNode));
  if (!(objectScope instanceof VariableScope)) {
    throw new Error("Never!!!");
  }
  const self = objectScope.body.get(THIS_TYPE);
  if (!(self instanceof VariableInfo)) {
    throw new Error("Never!!!");
  }
  // $FlowIssue
  let selfType: ObjectType =
    self.type instanceof GenericType ? self.type.subordinateType : self.type;
  const properties = [];
  for (const [key, property] of selfType.properties.entries()) {
    if (property.hasInitializer) {
      properties.push([key, property]);
    }
  }
  const name = ObjectType.getName(properties, selfType);
  selfType = ObjectType.term(name, {}, properties);
  self.type = selfType;
}

export function addClassToTypeGraph(
  classNode: Node,
  typeScope: TypeScope,
  typeGraph: ModuleScope,
  parentNode: Node,
  pre: Handler,
  middle: Handler,
  post: Handler,
  isTypeDefinitions: boolean
) {
  const classScope = typeGraph.body.get(VariableScope.getName(classNode));
  const name =
    classNode.id != undefined
      ? getDeclarationName(classNode)
      : getAnonymousKey(classNode);
  if (!(classScope instanceof VariableScope)) {
    throw new Error("Never!!!");
  }
  const self = classScope.findVariable(
    { name: THIS_TYPE },
    parentNode,
    typeGraph,
    pre,
    middle,
    post
  );
  // $FlowIssue
  const { properties } =
    self.type instanceof GenericType ? self.type.subordinateType : self.type;
  if (self.type.name === "{  }") {
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

  const superType = classScope.body.get("super");
  typeScope.body.set(name, self.type);
  const existedConstructor = classNode.body.body.find(m => m.kind === "constructor");
  if (existedConstructor && !isTypeDefinitions) {
    const constructorScope = typeGraph.body.get(
      VariableScope.getName(existedConstructor)
    );
    if (!(constructorScope instanceof VariableScope)) {
      throw new Error("Never!!!");
    }
    if (
      constructorScope.calls.find(call => call.targetName === "return") ===
      undefined
    ) {
      const callMeta = new CallMeta(
        new FunctionType("", {}, [self.type], self.type),
        [self],
        // $FlowIssue
        constructorScope.declaration.meta.loc,
        "return",
        false
      );
      constructorScope.calls.push(callMeta);
    }
    if (superType !== undefined) {
      const superCallIndex = constructorScope.calls.findIndex(
        call => call.targetName === "super"
      );
      const thisCallIndex = constructorScope.calls.findIndex(
        call => call.targetName === "this"
      );
      if (superCallIndex === -1) {
        throw new HegelError(
          'Constructor must contain "super" call super inside',
          // $FlowIssue
          constructorScope.declaration.meta.loc
        );
      }
      if (thisCallIndex !== -1 && superCallIndex > thisCallIndex) {
        throw new HegelError(
          '"super" must be called before accessing "this"',
          constructorScope.calls[thisCallIndex].loc
        );
      }
    }
  }
  classScope.isProcessed = true;
}

function getClassName(classNode: ClassDeclaration | ClassExpression) {
  if (classNode.id !== null) {
    return `class ${classNode.id.name}`;
  }
  return `Anonymous Class [${classNode.loc.start.line}:${
    classNode.loc.end.line
  }]`;
}
