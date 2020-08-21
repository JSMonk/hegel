// @flow
import NODE from "./nodes";
import HegelError from "./errors";
import { Meta } from "../type-graph/meta/meta";
import { Type } from "../type-graph/types/type";
import { CallMeta } from "../type-graph/meta/call-meta";
import { TypeScope } from "../type-graph/type-scope";
import { ObjectType } from "../type-graph/types/object-type";
import { $BottomType } from "../type-graph/types/bottom-type";
import { GenericType } from "../type-graph/types/generic-type";
import { FunctionType } from "../type-graph/types/function-type";
import { VariableInfo } from "../type-graph/variable-info";
import { VariableScope } from "../type-graph/variable-scope";
import { CollectionType } from "../type-graph/types/collection-type";
import { getPropertyName } from "./variable-utils";
import { addCallToTypeGraph } from "../type-graph/call";
import { functionWithReturnType } from "./function-utils";
import { getTypeFromTypeAnnotation } from "./type-utils";
import { THIS_TYPE, CALLABLE, CONSTRUCTABLE } from "../type-graph/constants";
import { getAnonymousKey, getDeclarationName } from "./common";
import {
  getParentForNode,
  getScopeFromNode,
  findNearestTypeScope,
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
  ObjectExpression,
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
  const classScope = typeGraph.scopes.get(VariableScope.getName(currentNode));
  if (classScope === undefined) {
    throw new Error("Never!!!");
  }
  if (classScope.declaration !== undefined) {
    return;
  }
  const parentTypeScope = findNearestTypeScope(classScope, typeGraph);
  const localTypeScope = new TypeScope(parentTypeScope);
  const genericArguments =
    currentNode.typeParameters &&
    currentNode.typeParameters.params.map((typeAnnotation) =>
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
    );
  const name =
    currentNode.id != undefined ? getDeclarationName(currentNode) : "{ }";
  const isGenericType = genericArguments != undefined;
  const typeName = isGenericType
    ? GenericType.getName(name, genericArguments)
    : name;
  const selfObject = ObjectType.term(
    typeName,
    {
      parent: isGenericType ? localTypeScope : typeScope,
      isNominal:
        currentNode.type === NODE.CLASS_EXPRESSION ||
        currentNode.type === NODE.CLASS_DECLARATION,
    },
    []
  );
  const self =
    currentNode.typeParameters === undefined
      ? selfObject
      : new $BottomType(
          {},
          GenericType.new(
            typeName,
            { parent: typeScope },
            genericArguments,
            localTypeScope,
            selfObject
          ),
          genericArguments
        );
  let superClass;
  if (currentNode.superClass != null) {
    superClass = addCallToTypeGraph(
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
    const $super = new ObjectType(
      String(superClass.name),
      { isSubtypeOf: superType },
      [[CALLABLE, new VariableInfo(superFunctionType, classScope)]]
    );
    const genericParams = (currentNode.superTypeParameters || []).map((arg) =>
      getTypeFromTypeAnnotation(
        { typeAnnotation: arg },
        typeScope,
        classScope.parent,
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
    classScope.body.set("super", new VariableInfo($super, classScope));
  }
  const selfVar = new VariableInfo(self, classScope);
  classScope.body.set(THIS_TYPE, selfVar);
  if (
    currentNode.type === NODE.CLASS_EXPRESSION ||
    currentNode.type === NODE.CLASS_DECLARATION
  ) {
    const typeInTypeScope =
      selfVar.type instanceof $BottomType
        ? selfVar.type.subordinateMagicType
        : selfVar.type;
    parentTypeScope.body.set(name, typeInTypeScope);
    if (typeInTypeScope instanceof GenericType) {
      typeInTypeScope.shouldBeUsedAsGeneric = true;
    }
    const staticName = getClassName(currentNode);
    const options = { isNominal: true, parent: typeScope };
    if (superClass !== undefined) {
      // $FlowIssue
      options.isSubtypeOf = superClass;
    }
    const staticSelfObject = ObjectType.term(staticName, options, []);
    const staticSelfVar = new VariableInfo<ObjectType>(
      staticSelfObject,
      classScope.parent
    );
    // $FlowIssue In Flow VariableInfo<ObjectType> is incompatible with VariableInfo<Type> even if you don't mutate argument
    classScope.parent.body.set(name, staticSelfVar);
    classScope.declaration = staticSelfVar;
    staticSelfObject.instanceType = self;
    selfObject.classType = staticSelfObject;
    const isConstructorPresented = currentNode.body.body.some(
      (m) => m.kind === "constructor"
    );
    if (!isConstructorPresented) {
      const $super = classScope.body.get("super");
      const parentConstructor =
        $super !== undefined && $super.type instanceof ObjectType
          ? $super.type.properties.get(CALLABLE)
          : undefined;
      const constructor: VariableInfo<
        FunctionType | GenericType<FunctionType>
      > =
        parentConstructor &&
        (parentConstructor.type instanceof FunctionType ||
          (parentConstructor.type instanceof GenericType &&
            parentConstructor.type.subordinateType instanceof FunctionType))
          ? (parentConstructor: any)
          : new VariableInfo(
              FunctionType.new(
                `() => ${name}`,
                { parent: self.parent },
                [],
                self
              ),
              classScope,
              new Meta(currentNode.loc)
            );
      if (!constructor.hasInitializer) {
        constructor.hasInitializer = true;
      }
      let type =
        constructor.type instanceof GenericType
          ? constructor.type.subordinateType
          : constructor.type;
      type.returnType =
        (type.returnType instanceof ObjectType ||
          type.returnType instanceof CollectionType) &&
        ObjectType.Object.isPrincipalTypeFor(type.returnType)
          ? type.returnType
          : self;
      if (self instanceof $BottomType) {
        const localTypeScope =
          constructor.type instanceof GenericType
            ? constructor.type.localTypeScope
            : self.subordinateMagicType.localTypeScope;
        const addition =
          constructor.type instanceof GenericType
            ? constructor.type.genericArguments
            : [];
        const genericArguments = Array.from(
          new Set([...self.genericArguments, ...addition])
        );
        type = GenericType.new(
          `constructor ${String(self.name)}`,
          {},
          genericArguments,
          localTypeScope,
          type
        );
      }
      constructor.type = type;
      staticSelfObject.properties.set(CONSTRUCTABLE, constructor);
    }
  }
  if (currentNode.implements) {
    const localTypeScope =
      self instanceof $BottomType
        ? self.subordinateMagicType.localTypeScope
        : typeScope;
    currentNode.implements = currentNode.implements.map((typeAnnotation) => {
      const typeForImplementation = getTypeFromTypeAnnotation(
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
      );
      if (
        !(typeForImplementation instanceof ObjectType) ||
        typeForImplementation.isStrict
      ) {
        throw new HegelError(
          "Type which should be implemented should be an soft objecty type",
          typeAnnotation.loc
        );
      }
      currentNode.body.body.forEach((node) => {
        if (
          node.type !== NODE.CLASS_PROPERTY &&
          node.type !== NODE.CLASS_PRIVATE_PROPERTY &&
          node.type !== NODE.CLASS_METHOD &&
          node.type !== NODE.CLASS_PRIVATE_METHOD
        ) {
          return;
        }
        const propertyName = getPropertyName(node, (node) =>
          addCallToTypeGraph(
            node,
            typeGraph,
            classScope,
            parentNode,
            precompute,
            middlecompute,
            postcompute,
            { skipAddingCalls: true }
          )
        );
        const existedProperty = typeForImplementation.properties.get(
          propertyName
        );
        if (existedProperty === undefined) {
          return;
        }
        node.expected = existedProperty.type;
      });
      return {
        loc: typeAnnotation.loc,
        id: typeAnnotation.id,
        typeForImplementation,
      };
    });
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
  const scopeName = VariableScope.getName(currentNode);
  const existed = typeGraph.scopes.get(scopeName);
  if (existed !== undefined) {
    return existed;
  }
  const name =
    currentNode.id != undefined
      ? getDeclarationName(currentNode)
      : getAnonymousKey(currentNode);
  const scope = getScopeFromNode(currentNode, parentNode, typeGraph);
  const parentTypeScope = findNearestTypeScope(scope, typeGraph);
  parentTypeScope.body.set(name, currentNode);
  typeGraph.scopes.set(scopeName, scope);
  if (scope.type === VariableScope.OBJECT_TYPE) {
    addThisToObjectScope(scope, currentNode);
  } else {
    currentNode.body.body.unshift({
      type: NODE.THIS_TYPE_DEFINITION,
      parentNode,
      definition: currentNode,
      loc: currentNode.loc,
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
  // $FlowIssue
  const currentClassScope: VariableScope = getParentForNode(
    currentNode,
    parentNode,
    typeGraph
  );
  const propertyName = getPropertyName(currentNode, (node) =>
    addCallToTypeGraph(
      node,
      typeGraph,
      currentClassScope,
      parentNode,
      pre,
      middle,
      post
    )
  );
  if (currentClassScope.isProcessed) {
    return;
  }
  // $FlowIssue
  const self: VariableInfo =
    currentNode.static || propertyName === CONSTRUCTABLE
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
    self.type instanceof $BottomType
      ? self.type.subordinateMagicType.subordinateType
      : self.type;
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
  const objectScope = typeGraph.scopes.get(VariableScope.getName(currentNode));
  if (objectScope === undefined) {
    throw new Error("Never!!!");
  }
  const self = objectScope.body.get(THIS_TYPE);
  if (!(self instanceof VariableInfo)) {
    throw new Error("Never!!!");
  }
  let selfType =
    self.type instanceof $BottomType
      ? self.type.subordinateMagicType.subordinateType
      : self.type;
  if (!(selfType instanceof ObjectType)) {
    throw new Error("Never!!!");
  }
  const properties = [];
  for (const [key, property] of selfType.properties.entries()) {
    if (property.hasInitializer) {
      properties.push([key, property]);
    }
  }
  const name = ObjectType.getName(properties, selfType);
  selfType = ObjectType.term(name, {}, properties);
  self.type = selfType;
  objectScope.isProcessed = true;
  return self;
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
): VariableInfo<ObjectType> {
  const classScope = typeGraph.scopes.get(VariableScope.getName(classNode));
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
    self.type instanceof $BottomType
      ? self.type.subordinateMagicType.subordinateType
      : self.type;
  if (self.type.name === "{  }") {
    self.type.name = ObjectType.getName([...properties]);
  }
  const superType = classScope.body.get("super");
  typeScope.body.set(
    name,
    self.type instanceof $BottomType
      ? self.type.subordinateMagicType
      : self.type
  );
  const selfObject =
    self.type instanceof $BottomType
      ? self.type.subordinateMagicType.subordinateType
      : self.type;
  if (!(selfObject instanceof ObjectType)) {
    throw new Error("Never!!!");
  }
  selfObject.parent = [...selfObject.properties].reduce(
    (parent, [_, { type }]) =>
      type !== undefined && parent.priority < type.parent.priority
        ? type.parent
        : parent,
    selfObject.parent
  );
  const existedConstructor = classNode.body.body.find(
    (m) => m.kind === "constructor"
  );
  if (existedConstructor && !isTypeDefinitions) {
    const constructorScope = typeGraph.scopes.get(
      VariableScope.getName(existedConstructor)
    );
    if (!(constructorScope instanceof VariableScope)) {
      throw new Error("Never!!!");
    }
    if (
      constructorScope.calls.find((call) => call.targetName === "return") ===
      undefined
    ) {
      const callMeta = new CallMeta(
        new FunctionType("", {}, [self.type], self.type),
        [self],
        // $FlowIssue
        constructorScope.declaration.meta.loc,
        "return",
        self.type.parent,
        false,
        true
      );
      constructorScope.calls.push(callMeta);
    }
    if (superType !== undefined) {
      const superCallIndex = constructorScope.calls.findIndex(
        (call) => call.targetName === "super"
      );
      const thisCallIndex = constructorScope.calls.findIndex(
        (call) => call.targetName === "this"
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
    if (self.type instanceof $BottomType) {
      const constructor: any = constructorScope.declaration;
      const type =
        constructor.type instanceof GenericType
          ? constructor.type.subordinateType
          : constructor.type;
      const localTypeScope =
        constructor.type instanceof GenericType
          ? constructor.type.localTypeScope
          : self.type.subordinateMagicType.localTypeScope;
      const addition =
        constructor.type instanceof GenericType
          ? constructor.type.genericArguments
          : [];
      const genericArguments = Array.from(
        new Set([...self.type.genericArguments, ...addition])
      );
      constructor.type = GenericType.new(
        `constructor ${String(self.type.name)}`,
        {},
        genericArguments,
        localTypeScope,
        type
      );
    }
  }
  if (classNode.implements) {
    const localTypeScope =
      self.type instanceof $BottomType
        ? self.type.subordinateMagicType.localTypeScope
        : typeScope;
    classNode.implements.forEach(({ typeForImplementation, id, loc }) => {
      if (!typeForImplementation.isPrincipalTypeFor(self.type)) {
        throw new HegelError(`Wrong implementation for type "${id.name}"`, loc);
      }
    });
  }
  const { declaration } = classScope;
  if (
    !isTypeDefinitions &&
    declaration !== undefined &&
    declaration.type instanceof ObjectType
  ) {
    const errors = [];
    [...properties, ...declaration.type.properties].forEach(
      ([key, property]) => {
        if (
          !property.hasInitializer &&
          !property.type.contains(Type.Undefined)
        ) {
          errors.push(
            new HegelError(
              `Property "${key}" has a type, but doesn't have an initializer!`,
              property.meta.loc
            )
          );
        }
      }
    );
    if (errors.length !== 0) {
      throw errors;
    }
  }
  classScope.isProcessed = true;
  // $FlowIssue
  return classScope.declaration;
}

function getClassName(classNode: ClassDeclaration | ClassExpression) {
  if (classNode.id !== null) {
    return `class ${classNode.id.name}`;
  }
  return `Anonymous Class [${classNode.loc.start.line}:${classNode.loc.end.line}]`;
}
