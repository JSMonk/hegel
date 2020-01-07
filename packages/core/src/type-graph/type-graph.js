// @flow
import NODE from "../utils/nodes";
import checkCalls from "../checking";
import traverseTree from "../utils/traverse";
import mixBaseGlobals from "../utils/globals";
import mixUtilityTypes from "../utils/utility-types";
import mixBaseOperators from "../utils/operators";
import mixImportedDependencies from "../utils/imports";
import HegelError, { UnreachableError } from "../utils/errors";
import { Meta } from "./meta/meta";
import { Type } from "./types/type";
import { Scope } from "./scope";
import { THIS_TYPE } from "../type-graph/constants";
import { refinement } from "../inference/refinement";
import { ObjectType } from "./types/object-type";
import { addPosition } from "../utils/position-utils";
import { GenericType } from "./types/generic-type";
import { ModuleScope } from "./module-scope";
import { FunctionType } from "./types/function-type";
import { VariableInfo } from "./variable-info";
import { getVariableType } from "../utils/variable-utils";
import { addVariableToGraph } from "../utils/variable-utils";
import { inferenceErrorType } from "../inference/error-type";
import { inferenceTypeForNode } from "../inference";
import { findVariableInfo, findRecordInfo } from "../utils/common";
import { addCallToTypeGraph, addPropertyToThis } from "./call";
import { POSITIONS, TYPE_SCOPE, UNDEFINED_TYPE } from "./constants";
import {
  createSelf,
  addTypeNodeToTypeGraph,
  getTypeFromTypeAnnotation
} from "../utils/type-utils";
import {
  addFunctionToTypeGraph,
  addFunctionNodeToTypeGraph
} from "../utils/function-utils";
import {
  addObjectName,
  addClassToTypeGraph,
  addThisToClassScope,
  addPropertyNodeToThis,
  addClassScopeToTypeGraph,
} from "../utils/class-utils";
import {
  prepareGenericFunctionType,
  inferenceFunctionTypeByScope
} from "../inference/function-type";
import {
  getParentForNode,
  getScopeFromNode,
  addScopeToTypeGraph
} from "../utils/scope-utils";
import type { CallableArguments } from "./meta/call-meta";
import type { TraverseMeta, Handler } from "../utils/traverse";
import type { Node, Program, SourceLocation } from "@babel/parser";

const hasTypeParams = (node: Node): boolean =>
  node.typeParameters &&
  (node.typeParameters.type === NODE.TYPE_PARAMETER_DECLARATION ||
    node.typeParameters.type === NODE.TS_TYPE_PARAMETER_DECLARATION) &&
  Array.isArray(node.typeParameters.params) &&
  node.typeParameters.params.length !== 0;

const getAliasBody = (node: Node) => {
  switch (node.type) {
    case NODE.TYPE_ALIAS:
      return { typeAnnotation: node.right };
    case NODE.TS_INTERFACE_DECLARATION:
      return { typeAnnotation: node };
    case NODE.TS_TYPE_ALIAS:
      return node;
  }
  throw new Error("Never!");
};

const addTypeAlias = (
  node: Node,
  parentNode: Node,
  typeGraph: ModuleScope,
  precompute: Handler,
  middlecompute: Handler,
  postcompute: Handler
) => {
  const typeScope = typeGraph.body.get(TYPE_SCOPE);
  if (typeScope === undefined || !(typeScope instanceof Scope)) {
    throw new Error(
      "Type scope should be presented before type alias has been met"
    );
  }
  const localTypeScope = new Scope(Scope.BLOCK_TYPE, typeScope);
  const typeName = node.id.name;
  const self = createSelf(node, localTypeScope);
  localTypeScope.body.set(typeName, self);
  const genericArguments =
    node.typeParameters &&
    node.typeParameters.params.map(typeAnnotation =>
      getTypeFromTypeAnnotation(
        { typeAnnotation },
        localTypeScope,
        typeGraph,
        true,
        null,
        parentNode,
        typeGraph,
        precompute,
        middlecompute,
        postcompute
      )
    );
  const type = getTypeFromTypeAnnotation(
    getAliasBody(node),
    localTypeScope,
    typeGraph,
    false,
    self.type,
    parentNode,
    typeGraph,
    precompute,
    middlecompute,
    postcompute
  );
  if (genericArguments) {
    type.name = GenericType.getName(type.name, genericArguments);
  }
  const typeFor = genericArguments
    ? GenericType.createTypeWithName(
        typeName,
        typeScope,
        genericArguments,
        localTypeScope,
        type
      )
    : type;
  self.type.root = typeFor;
  self.type.name = typeFor.name;
  localTypeScope.body.delete(typeName);
  const typeAlias = new VariableInfo(typeFor, typeScope, new Meta(node.loc));
  if (genericArguments) {
    typeAlias.isGeneric = true;
  }
  typeScope.body.set(typeName, typeAlias);
  if (node.exportAs) {
    typeGraph.exportsTypes.set(node.exportAs, typeAlias);
  }
};

const fillModuleScope = (
  typeGraph: ModuleScope,
  errors: Array<HegelError>,
  isTypeDefinitions: boolean
) => {
  const typeScope = typeGraph.body.get(TYPE_SCOPE);
  if (!typeScope || !(typeScope instanceof Scope)) {
    throw new Error("Type scope is not a scope.");
  }
  return (
    currentNode: Node,
    parentNode: Node,
    precompute: Handler,
    middlecompute: Handler,
    postcompute: Handler,
    meta?: TraverseMeta = {}
  ) => {
    switch (currentNode.type) {
      case NODE.VARIABLE_DECLARATION:
        if (currentNode.init != undefined) {
          currentNode.declarations.forEach(a =>
            Object.assign(a, { init: currentNode.init })
          );
        }
        break;
      case NODE.TYPE_ALIAS:
      case NODE.TS_TYPE_ALIAS:
      case NODE.TS_INTERFACE_DECLARATION:
        addTypeAlias(
          currentNode,
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute
        );
        break;
      case NODE.CLASS_DECLARATION:
      case NODE.CLASS_EXPRESSION:
      case NODE.OBJECT_EXPRESSION:
        addClassScopeToTypeGraph(
          currentNode,
          parentNode,
          typeGraph,
        );
        break;
      case NODE.IF_STATEMENT:
      case NODE.WHILE_STATEMENT:
      case NODE.DO_WHILE_STATEMENT:
      case NODE.FOR_STATEMENT:
      case NODE.FOR_IN_STATEMENT:
      case NODE.FOR_OF_STATEMENT:
        const block = currentNode.body || currentNode.consequent;
        addScopeToTypeGraph(block, parentNode, typeGraph);
        if (currentNode.alternate) {
          addScopeToTypeGraph(currentNode.alternate, parentNode, typeGraph);
        }
        refinement(
          currentNode,
          getParentForNode(block, parentNode, typeGraph),
          typeScope,
          typeGraph
        );
        break;
      case NODE.FUNCTION_DECLARATION:
      case NODE.TS_FUNCTION_DECLARATION:
        const existedRecord = findRecordInfo(
          currentNode.id,
          getParentForNode(currentNode, parentNode, typeGraph)
        );
        if (existedRecord instanceof VariableInfo) {
          return false;
        }
      case NODE.FUNCTION_EXPRESSION:
      case NODE.ARROW_FUNCTION_EXPRESSION:
        addFunctionToTypeGraph(
          currentNode,
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute,
          isTypeDefinitions
        );
        break;
      case NODE.BLOCK_STATEMENT:
        if (NODE.isFunction(parentNode)) {
          break;
        }
        addScopeToTypeGraph(currentNode, parentNode, typeGraph);
        break;
      case NODE.OBJECT_METHOD:
      case NODE.CLASS_METHOD:
      case NODE.TS_DECLARE_METHOD:
        const classScope = typeGraph.body.get(Scope.getName(parentNode));
        if (!(classScope instanceof Scope)) {
          throw new Error("Never!!!");
        }
        if (classScope.declaration !== undefined) {
          return;
        }
        const classVar = findVariableInfo({ name: THIS_TYPE }, classScope);
        const classType =
          classVar.type instanceof GenericType
            ? classVar.type.subordinateType
            : classVar.type;
        const propertyName = currentNode.key.name;
        // $FlowIssue
        if (classType.properties.get(propertyName) instanceof VariableInfo) {
          return false;
        }
        const fn = addFunctionToTypeGraph(
          currentNode,
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute,
          isTypeDefinitions
        );
        fn.hasInitializer = true;
        // $FlowIssue
        classType.properties.set(propertyName, fn);
        break;
      case NODE.TRY_STATEMENT:
        const tryBlock = getScopeFromNode(
          currentNode.block,
          parentNode,
          typeGraph
        );
        tryBlock.throwable = [];
        typeGraph.body.set(Scope.getName(currentNode.block), tryBlock);
        if (!currentNode.handler) {
          return true;
        }
        const handlerScopeKey = Scope.getName(currentNode.handler.body);
        typeGraph.body.set(
          handlerScopeKey,
          getScopeFromNode(currentNode.handler.body, parentNode, typeGraph)
        );
        if (!currentNode.handler.param) {
          return true;
        }
        addVariableToGraph(
          currentNode.handler.param,
          currentNode.handler.body,
          typeGraph,
          precompute,
          middlecompute,
          postcompute,
          currentNode.handler.param.name
        );
        break;
    }
    return true;
  };
};

const middlefillModuleScope = (
  typeGraph: ModuleScope,
  errors: Array<HegelError>,
  isTypeDefinitions: boolean
) => {
  const typeScope = typeGraph.body.get(TYPE_SCOPE);
  if (!(typeScope instanceof Scope)) {
    throw new Error("Type scope is not a scope.");
  }
  return (
    currentNode: Node,
    parentNode: Node,
    precompute: Handler,
    middlecompute: Handler,
    postcompute: Handler,
    meta?: TraverseMeta = {}
  ) => {
    const typeScope = typeGraph.body.get(TYPE_SCOPE);
    if (
      currentNode.type === NODE.EXPORT_NAMED_DECLARATION ||
      currentNode.type === NODE.EXPORT_DEFAULT_DECLARATION
    ) {
      currentNode = currentNode.declaration;
    }
    switch (currentNode.type) {
      case NODE.OBJECT_PROPERTY:
      case NODE.OBJECT_METHOD:
      case NODE.CLASS_PROPERTY:
      case NODE.CLASS_METHOD:
        addPropertyNodeToThis(currentNode, parentNode, typeGraph, precompute, middlecompute, postcompute);
        break;
      case NODE.FUNCTION_DECLARATION:
      case NODE.TS_FUNCTION_DECLARATION:
        addFunctionNodeToTypeGraph(currentNode, parentNode, typeGraph);
        break;
      case NODE.TS_INTERFACE_DECLARATION:
        addTypeNodeToTypeGraph(currentNode, typeGraph);
        break;
    }
  };
};

const afterFillierActions = (
  typeGraph: ModuleScope,
  errors: Array<HegelError>,
  isTypeDefinitions: boolean
) => {
  const typeScope = typeGraph.body.get(TYPE_SCOPE);
  if (!typeScope || !(typeScope instanceof Scope)) {
    throw new Error("Type scope is not a scope.");
  }
  return (
    currentNode: Node,
    parentNode: Node | Scope | ModuleScope,
    precompute: Handler,
    middlecompute: Handler,
    postcompute: Handler,
    meta?: Object = {}
  ) => {
    const currentScope = getParentForNode(currentNode, parentNode, typeGraph);
    switch (currentNode.type) {
      case NODE.OBJECT_EXPRESSION:
        addObjectName(currentNode, typeGraph);
        break;
      case NODE.THIS_TYPE_DEFINITION:
        addThisToClassScope(
          currentNode.definition,
          parentNode,
          typeScope,
          typeGraph,
          precompute,
          middlecompute,
          postcompute
        );
        break;
      case NODE.CLASS_PROPERTY:
      case NODE.OBJECT_PROPERTY:
        addPropertyToThis(
          currentNode,
          parentNode,
          typeScope,
          typeGraph,
          precompute,
          middlecompute,
          postcompute
        );
        break;
      case NODE.CLASS_DECLARATION:
      case NODE.CLASS_EXPRESSION:
        addClassToTypeGraph(
          currentNode,
          typeScope,
          typeGraph,
          parentNode,
          precompute,
          middlecompute,
          postcompute,
          isTypeDefinitions
        );
        break;
      case NODE.TYPE_ALIAS:
      case NODE.TS_TYPE_ALIAS:
      case NODE.TS_INTERFACE_DECLARATION:
        if (
          currentNode.exportAs &&
          !typeGraph.exportsTypes.has(currentNode.exportAs)
        ) {
          const type = findVariableInfo(currentNode.id, typeGraph);
          typeGraph.exportsTypes.set(currentNode.exportAs, type);
        }
        break;
      case NODE.VARIABLE_DECLARATOR:
        const variableInfo = addVariableToGraph(
          Object.assign(currentNode, meta),
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute
        );
        const newTypeOrVar =
          isTypeDefinitions && !currentNode.init
            ? new Type("unknown")
            : addCallToTypeGraph(
                currentNode,
                typeGraph,
                currentScope,
                parentNode,
                precompute,
                middlecompute,
                postcompute
              );
        if (variableInfo.type.name === UNDEFINED_TYPE) {
          const newType =
            newTypeOrVar.result instanceof VariableInfo
              ? newTypeOrVar.result.type
              : newTypeOrVar.result;
          variableInfo.type = getVariableType(
            variableInfo,
            newType,
            typeScope,
            newTypeOrVar.inferenced
          );
        }
        if (currentNode.exportAs) {
          typeGraph.exports.set(currentNode.exportAs, variableInfo);
        }
        break;
      case NODE.BLOCK_STATEMENT:
        if (!currentNode.catchBlock || !currentNode.catchBlock.param) {
          return;
        }
        if (currentNode.catchBlock.param.type !== NODE.IDENTIFIER) {
          throw new Error("Unsupported yet");
        }
        const errorVariable = findVariableInfo(
          currentNode.catchBlock.param,
          getParentForNode(
            currentNode.catchBlock.param,
            currentNode.catchBlock.body,
            typeGraph
          ),
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute
        );
        errorVariable.type = inferenceErrorType(currentNode, typeGraph);
        addPosition(currentNode.catchBlock.param, errorVariable, typeGraph);
        break;
      case NODE.IF_STATEMENT:
      case NODE.RETURN_STATEMENT:
      case NODE.EXPRESSION_STATEMENT:
      case NODE.WHILE_STATEMENT:
      case NODE.DO_WHILE_STATEMENT:
      case NODE.FOR_STATEMENT:
      case NODE.THROW_STATEMENT:
        const resultOfCall = addCallToTypeGraph(
          currentNode,
          typeGraph,
          currentScope,
          parentNode,
          precompute,
          middlecompute,
          postcompute
        ).result;
        if (currentNode.exportAs) {
          typeGraph.exports.set(currentNode.exportAs, resultOfCall);
        }
        break;
      case NODE.OBJECT_METHOD:
      case NODE.CLASS_METHOD:
      case NODE.FUNCTION_EXPRESSION:
      case NODE.ARROW_FUNCTION_EXPRESSION:
      case NODE.FUNCTION_DECLARATION:
        const functionScope = typeGraph.body.get(Scope.getName(currentNode));
        if (!(functionScope instanceof Scope)) {
          throw new Error("Never!");
        }
        if (functionScope.declaration instanceof VariableInfo) {
          const fnType = functionScope.declaration.type;
          if (
            fnType instanceof GenericType &&
            functionScope.type === Scope.FUNCTION_TYPE &&
            fnType.subordinateType instanceof FunctionType
          ) {
            // $FlowIssue - Type refinements
            prepareGenericFunctionType(functionScope);
            if (fnType.genericArguments.some(a => !a.isUserDefined)) {
              // $FlowIssue - Type refinements
              inferenceFunctionTypeByScope(functionScope, typeScope, typeGraph);
            }
          }
          const { declaration } = functionScope;
          if (currentNode.exportAs) {
            typeGraph.exports.set(currentNode.exportAs, declaration);
          }
          const declarationType: any =
            declaration.type instanceof GenericType
              ? declaration.type.subordinateType
              : declaration.type;
          declarationType.throwable = (functionScope.throwable || []).length
            ? inferenceErrorType(currentNode, typeGraph)
            : undefined;
        }
        break;
      case NODE.TS_EXPORT_ASSIGNMENT:
        const whatWillBeExported = inferenceTypeForNode(
          currentNode.expression,
          typeScope,
          currentScope,
          typeGraph,
          parentNode,
          precompute,
          middlecompute,
          postcompute,
          isTypeDefinitions
        );
        typeGraph.exports.set("default", whatWillBeExported);
        if (whatWillBeExported instanceof ObjectType) {
          whatWillBeExported.properties.forEach((value, key) => {
            typeGraph.exports.set(key, value.type);
          });
        }
        break;
      default:
        if (currentNode.exportAs) {
          typeGraph.exports.set(
            currentNode.exportAs,
            inferenceTypeForNode(
              currentNode,
              typeScope,
              currentScope,
              typeGraph,
              parentNode,
              precompute,
              middlecompute,
              postcompute,
              isTypeDefinitions
            )
          );
        }
    }
    if (
      currentNode.type === NODE.THROW_STATEMENT ||
      currentNode.type === NODE.RETURN_STATEMENT
    ) {
      throw new UnreachableError(currentNode.loc);
    }
  };
};

async function createModuleScope(
  ast: Program,
  errors: Array<HegelError>,
  getModuleTypeGraph: (string, string, SourceLocation) => Promise<ModuleScope>,
  globalModule: ModuleScope,
  isTypeDefinitions: boolean
): Promise<ModuleScope> {
  const module = new ModuleScope(new Map(), globalModule);
  const typeScope = new Scope(
    "block",
    /*::(*/ globalModule.body.get(TYPE_SCOPE) /*:::any)*/
  );
  module.body.set(TYPE_SCOPE, typeScope);
  module.body.set(POSITIONS, new Scope("block", module));
  await mixImportedDependencies(
    ast,
    errors,
    module,
    typeScope,
    getModuleTypeGraph
  );
  try {
    traverseTree(
      ast,
      fillModuleScope(module, errors, isTypeDefinitions),
      middlefillModuleScope(module, errors, isTypeDefinitions),
      afterFillierActions(module, errors, isTypeDefinitions)
    );
  } catch (e) {
    if (!(e instanceof HegelError) && !Array.isArray(e)) {
      throw e;
    }
    if (Array.isArray(e)) {
      errors.push(...e.map(e => Object.assign(e, { path: ast.path })));
    } else {
      e.source = ast.path;
      errors.push(e);
    }
  }
  module.body.forEach(scope => {
    if (scope instanceof Scope) {
      checkCalls(ast.path, scope, typeScope, errors);
    }
  });
  checkCalls(ast.path, module, typeScope, errors);
  return module;
}

async function createGlobalScope(
  ast: Array<Program>,
  getModuleTypeGraph: (
    string,
    string,
    SourceLocation,
    (Program, boolean) => Promise<ModuleScope>
  ) => Promise<ModuleScope>,
  isTypeDefinitions: boolean = false,
  mixTypeDefinitions: Scope => void = a => {}
): Promise<[Array<ModuleScope>, Array<HegelError>, ModuleScope]> {
  const errors: Array<HegelError> = [];
  const globalModule = new ModuleScope();
  const globalTypeScope = new Scope("block", globalModule);
  globalModule.body.set(TYPE_SCOPE, globalTypeScope);
  globalModule.body.set(POSITIONS, new Scope("block", globalModule));
  mixUtilityTypes(globalModule);
  mixBaseGlobals(globalModule);
  mixTypeDefinitions(globalModule);
  mixBaseOperators(globalModule);
  const createDependencyModuleScope = (
    ast: Program,
    isTypeDefinitions: boolean
  ) =>
    createModuleScope(
      ast,
      errors,
      getModuleFromString,
      globalModule,
      isTypeDefinitions
    );
  const getModuleFromString = (
    path: string,
    currentPath: string,
    loc: SourceLocation
  ) => getModuleTypeGraph(path, currentPath, loc, createDependencyModuleScope);
  const modules = await Promise.all(
    ast.map(module =>
      createModuleScope(
        module,
        errors,
        getModuleFromString,
        globalModule,
        isTypeDefinitions
      )
    )
  );
  return [modules, errors, globalModule];
}

export default createGlobalScope;
