// @flow
import NODE from "../utils/nodes";
import checkCalls from "../checking";
import traverseTree from "../utils/traverse";
import mixBaseGlobals from "../utils/globals";
import mixUtilityTypes from "../utils/utility-types";
import mixBaseOperators from "../utils/operators";
import mixImportedDependencies from "../utils/imports";
import HegelError, { UnreachableError } from "../utils/errors";
import { Type } from "./types/type";
import { TypeScope } from "./type-scope";
import { refinement } from "../inference/refinement";
import { ObjectType } from "./types/object-type";
import { GenericType } from "./types/generic-type";
import { FunctionType } from "./types/function-type";
import { VariableInfo } from "./variable-info";
import { VariableScope } from "./variable-scope";
import { getVariableType } from "../utils/variable-utils";
import { addVariableToGraph } from "../utils/variable-utils";
import { inferenceErrorType } from "../inference/error-type";
import { ModuleScope, PositionedModuleScope } from "./module-scope";
import { addCallToTypeGraph, addPropertyToThis, addMethodToThis } from "./call";
import { setupBaseHierarchy, setupFullHierarchy } from "../utils/hierarchy";
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
  addClassToTypeGraph,
  addThisToClassScope,
  addObjectToTypeGraph,
  addPropertyNodeToThis,
  addClassScopeToTypeGraph
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
  throw new Error(node.type);
};

const addTypeAlias = (
  node: Node,
  parentNode: Node,
  typeGraph: ModuleScope,
  precompute: Handler,
  middlecompute: Handler,
  postcompute: Handler
) => {
  const typeScope = typeGraph.typeScope;
  const selfTypeScope = new TypeScope(typeScope);
  const localTypeScope = new TypeScope(selfTypeScope);
  const typeName = node.id.name;
  const self = createSelf(node, selfTypeScope);
  selfTypeScope.body.set(typeName, self);
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
  const name =
    genericArguments != undefined
      ? GenericType.getName(typeName, genericArguments)
      : undefined;
  const type = getTypeFromTypeAnnotation(
    getAliasBody(node),
    localTypeScope,
    typeGraph,
    false,
    self,
    parentNode,
    typeGraph,
    precompute,
    middlecompute,
    postcompute,
    name
  );
  const typeAlias = genericArguments
    ? GenericType.new(
        typeName,
        { parent: typeScope },
        genericArguments,
        localTypeScope,
        type
      )
    : type;
  self.root = typeAlias;
  self.name = typeAlias.name;
  localTypeScope.body.delete(typeName);
  if (genericArguments != null) {
    typeAlias.shouldBeUsedAsGeneric = true;
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
  const typeScope = typeGraph.typeScope;
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
      case NODE.VARIABLE_DECLARATOR:
        const variableInfo = addVariableToGraph(
          Object.assign(currentNode, meta),
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute
        );
        if (
          currentNode.init != undefined &&
          variableInfo.type !== Type.Unknown
        ) {
          currentNode.init.expected = variableInfo.type;
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
        addClassScopeToTypeGraph(currentNode, parentNode, typeGraph);
        break;
      case NODE.LOGICAL_EXPRESSION:
        refinement(
          currentNode,
          getParentForNode(currentNode, parentNode, typeGraph),
          typeScope,
          typeGraph
        );
        break;
      case NODE.IF_STATEMENT:
      case NODE.WHILE_STATEMENT:
      case NODE.DO_WHILE_STATEMENT:
      case NODE.FOR_STATEMENT:
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
        if (currentNode.test != undefined) {
          currentNode.test.isRefinemented = true;
        }
        break;
      case NODE.FUNCTION_DECLARATION:
      case NODE.TS_FUNCTION_DECLARATION:
        const existedRecord = getParentForNode(
          currentNode,
          parentNode,
          typeGraph
        ).findRecord(currentNode.id);
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
        if (NODE.isFunction(parentNode) && parentNode.body === currentNode) {
          break;
        }
        addScopeToTypeGraph(currentNode, parentNode, typeGraph);
        break;
      case NODE.OBJECT_METHOD:
      case NODE.CLASS_METHOD:
      case NODE.TS_DECLARE_METHOD:
        addMethodToThis(
          currentNode,
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute,
          isTypeDefinitions
        );
        break;
      case NODE.TRY_STATEMENT:
        currentNode.block.skipCalls = true;
        const tryBlock = getScopeFromNode(
          currentNode.block,
          parentNode,
          typeGraph
        );
        tryBlock.throwable = [];
        typeGraph.body.set(VariableScope.getName(currentNode.block), tryBlock);
        if (!currentNode.handler) {
          return true;
        }
        const handlerScopeKey = VariableScope.getName(currentNode.handler.body);
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
  const typeScope = typeGraph.typeScope;
  return (
    currentNode: Node,
    parentNode: Node,
    precompute: Handler,
    middlecompute: Handler,
    postcompute: Handler,
    meta?: TraverseMeta = {}
  ) => {
    if (
      currentNode.type === NODE.EXPORT_NAMED_DECLARATION ||
      currentNode.type === NODE.EXPORT_DEFAULT_DECLARATION
    ) {
      currentNode = currentNode.declaration;
    }
    switch (currentNode.type) {
      case NODE.THIS_TYPE_DEFINITION:
        addThisToClassScope(
          currentNode,
          parentNode,
          typeScope,
          typeGraph,
          precompute,
          middlecompute,
          postcompute
        );
        break;
      case NODE.OBJECT_PROPERTY:
      case NODE.OBJECT_METHOD:
      case NODE.CLASS_PROPERTY:
      case NODE.CLASS_METHOD:
        addPropertyNodeToThis(
          currentNode,
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute
        );
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
  moduleScope: ModuleScope | PositionedModuleScope,
  errors: Array<HegelError>,
  isTypeDefinitions: boolean
) => {
  const typeScope = moduleScope.typeScope;
  return (
    currentNode: Node,
    parentNode: Node,
    precompute: Handler,
    middlecompute: Handler,
    postcompute: Handler,
    meta?: Object = {}
  ) => {
    const currentScope = getParentForNode(currentNode, parentNode, moduleScope);
    switch (currentNode.type) {
      case NODE.OBJECT_EXPRESSION:
        addObjectToTypeGraph(currentNode, moduleScope);
        break;
      case NODE.CLASS_PROPERTY:
      case NODE.OBJECT_PROPERTY:
        addPropertyToThis(
          currentNode,
          parentNode,
          typeScope,
          moduleScope,
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
          moduleScope,
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
        const type = Type.find(
          currentNode.id.name,
          { parent: typeScope },
          parentNode,
          moduleScope,
          precompute,
          middlecompute,
          postcompute
        );
        if (
          currentNode.exportAs &&
          !moduleScope.exportsTypes.has(currentNode.exportAs)
        ) {
          moduleScope.exportsTypes.set(currentNode.exportAs, type);
        }
        break;
      case NODE.VARIABLE_DECLARATION:
        break;
      case NODE.VARIABLE_DECLARATOR:
        const variableInfo = currentScope.findVariable(currentNode.id);
        const newTypeOrVar =
          isTypeDefinitions && currentNode.init === null
            ? Type.Unknown
            : addCallToTypeGraph(
                currentNode,
                moduleScope,
                currentScope,
                parentNode,
                precompute,
                middlecompute,
                postcompute
              );
        if (
          currentNode.id != null &&
          currentNode.id.typeAnnotation == undefined
        ) {
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
          moduleScope.exports.set(currentNode.exportAs, variableInfo);
        }
        break;
      case NODE.BLOCK_STATEMENT:
        if (!currentNode.catchBlock || !currentNode.catchBlock.param) {
          return;
        }
        if (currentNode.catchBlock.param.type !== NODE.IDENTIFIER) {
          throw new Error("Unsupported yet");
        }
        const errorVariable = getParentForNode(
          currentNode.catchBlock.param,
          currentNode.catchBlock.body,
          moduleScope
        ).findVariable(
          currentNode.catchBlock.param,
          parentNode,
          moduleScope,
          precompute,
          middlecompute,
          postcompute
        );
        errorVariable.type = inferenceErrorType(currentNode, moduleScope);
        if (moduleScope instanceof PositionedModuleScope) {
          moduleScope.addPosition(currentNode.catchBlock.param, errorVariable);
        }
        break;
      case NODE.IF_STATEMENT:
      case NODE.RETURN_STATEMENT:
      case NODE.EXPRESSION_STATEMENT:
      case NODE.WHILE_STATEMENT:
      case NODE.DO_WHILE_STATEMENT:
      case NODE.FOR_STATEMENT:
      case NODE.THROW_STATEMENT:
      case NODE.NEW_EXPRESSION:
        const resultOfCall = addCallToTypeGraph(
          currentNode,
          moduleScope,
          currentScope,
          parentNode,
          precompute,
          middlecompute,
          postcompute
        ).result;
        if (currentNode.exportAs) {
          const exportVar =
            resultOfCall instanceof VariableInfo
              ? resultOfCall
              : new VariableInfo(resultOfCall, moduleScope);
          moduleScope.exports.set(currentNode.exportAs, exportVar);
        }
        break;
      case NODE.OBJECT_METHOD:
      case NODE.CLASS_METHOD:
      case NODE.FUNCTION_EXPRESSION:
      case NODE.ARROW_FUNCTION_EXPRESSION:
      case NODE.FUNCTION_DECLARATION:
        const functionScope = moduleScope.body.get(
          VariableScope.getName(currentNode)
        );
        if (!(functionScope instanceof VariableScope)) {
          throw new Error("Never!");
        }
        if (functionScope.declaration instanceof VariableInfo) {
          const fnType = functionScope.declaration.type;
          if (
            fnType instanceof GenericType &&
            functionScope.type === VariableScope.FUNCTION_TYPE &&
            fnType.subordinateType instanceof FunctionType
          ) {
            // $FlowIssue - Type refinements
            prepareGenericFunctionType(functionScope);
            if (fnType.genericArguments.some(a => !a.isUserDefined)) {
              inferenceFunctionTypeByScope(
                // $FlowIssue - Type refinements
                functionScope,
                typeScope,
                moduleScope
              );
            }
          }
          const { declaration } = functionScope;
          if (currentNode.exportAs) {
            moduleScope.exports.set(currentNode.exportAs, declaration);
          }
          const declarationType: any =
            declaration.type instanceof GenericType
              ? declaration.type.subordinateType
              : declaration.type;
          declarationType.throwable = (functionScope.throwable || []).length
            ? inferenceErrorType(currentNode, moduleScope)
            : undefined;
        }
        break;
      case NODE.TS_EXPORT_ASSIGNMENT:
        let whatWillBeExported = addCallToTypeGraph(
          currentNode.expression,
          moduleScope,
          currentScope,
          parentNode,
          precompute,
          middlecompute,
          postcompute
        ).result;
        if (whatWillBeExported instanceof Type) {
          whatWillBeExported = new VariableInfo(
            whatWillBeExported,
            moduleScope
          );
        }
        moduleScope.exports.set("default", whatWillBeExported);
        const exportedType = whatWillBeExported.type;
        if (exportedType instanceof ObjectType) {
          exportedType.properties.forEach((value, key) => {
            moduleScope.exports.set(key, value);
          });
        }
        break;
    }
    if (
      currentNode.type === NODE.THROW_STATEMENT ||
      currentNode.type === NODE.RETURN_STATEMENT
    ) {
      throw new UnreachableError(currentNode.loc);
    }
  };
};

export async function createModuleScope(
  ast: Program,
  errors: Array<HegelError>,
  getModuleTypeGraph: (string, string, SourceLocation) => Promise<ModuleScope>,
  globalModule: ModuleScope,
  isTypeDefinitions: boolean,
  withPositions?: boolean = true
): Promise<ModuleScope> {
  const typeScope = new TypeScope(globalModule.typeScope);
  const module = new (withPositions ? PositionedModuleScope : ModuleScope)(
    new Map(),
    globalModule,
    typeScope
  );
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
    if (scope instanceof VariableScope) {
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
    (Program, boolean) => Promise<ModuleScope | PositionedModuleScope>
  ) => Promise<ModuleScope | PositionedModuleScope>,
  isTypeDefinitions: boolean = false,
  mixTypeDefinitions: ModuleScope => void | Promise<void> = a => {},
  withPositions?: boolean = false
): Promise<
  [Array<ModuleScope | PositionedModuleScope>, Array<HegelError>, ModuleScope]
> {
  const errors: Array<HegelError> = [];
  const globalModule = new ModuleScope();
  mixBaseGlobals(globalModule);
  setupBaseHierarchy(globalModule.typeScope);
  await mixTypeDefinitions(globalModule);
  setupFullHierarchy(globalModule.typeScope);
  mixUtilityTypes(globalModule);
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
        isTypeDefinitions,
        withPositions
      )
    )
  );
  return [modules, errors, globalModule];
}

export default createGlobalScope;
