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
import { Meta } from "./meta/meta";
import { TypeVar } from "./types/type-var";
import { UnionType } from "./types/union-type";
import { TypeScope } from "./type-scope";
import { refinement } from "../inference/refinement";
import { ObjectType } from "./types/object-type";
import { GenericType } from "./types/generic-type";
import { FunctionType } from "./types/function-type";
import { VariableInfo } from "./variable-info";
import { VariableScope } from "./variable-scope";
import { IgnorableArray } from "../utils/ignore";
import { getVariableType } from "../utils/variable-utils";
import { addVariableToGraph } from "../utils/variable-utils";
import { findUnhandledCases } from "../inference/switch-refinement";
import { inferenceErrorType } from "../inference/error-type";
import { findNearestTypeScope } from "../utils/scope-utils";
import { ModuleScope, PositionedModuleScope } from "./module-scope";
import { addCallToTypeGraph, addPropertyToThis, addMethodToThis } from "./call";
import {
  setupBaseHierarchy,
  setupFullHierarchy,
  dropAllGlobals
} from "../utils/hierarchy";
import {
  addTypeNodeToTypeGraph,
  getTypeFromTypeAnnotation
} from "../utils/type-utils";
import {
  isSideEffectCall,
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
import type { Node, File, Program, SourceLocation } from "@babel/parser";

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
  const localTypeScope = new TypeScope(typeScope);
  const typeName = node.id.name;
  const self = TypeVar.createSelf(typeName, typeScope);
  typeScope.body.set(typeName, self);
  const genericArguments =
    node.typeParameters &&
    node.typeParameters.params.map(typeAnnotation =>
      getTypeFromTypeAnnotation(
        { typeAnnotation },
        localTypeScope,
        typeGraph,
        true,
        self,
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
  if (genericArguments != null) {
    typeAlias.shouldBeUsedAsGeneric = true;
    self.shouldBeUsedAsGeneric = true;
  }
  typeScope.body.set(typeName, typeAlias);
  if (node.exportAs) {
    typeGraph.exportsTypes.set(node.exportAs, typeAlias);
  }

  if (typeGraph instanceof PositionedModuleScope) {
    typeGraph.addPosition(node.id, type);
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
    if (
      currentNode.type === NODE.EXPORT_NAMED_DECLARATION ||
      currentNode.type === NODE.EXPORT_DEFAULT_DECLARATION
    ) {
      currentNode = currentNode.declaration;
    }
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
      case NODE.CONDITIONAL_EXPRESSION:
      case NODE.SWITCH_CASE:
        refinement(
          currentNode,
          getParentForNode(currentNode, parentNode, typeGraph),
          typeScope,
          typeGraph,
          errors
        );
        break;
      case NODE.IF_STATEMENT:
      case NODE.WHILE_STATEMENT:
      case NODE.DO_WHILE_STATEMENT:
      case NODE.FOR_STATEMENT:
      case NODE.FOR_OF_STATEMENT:
      case NODE.FOR_IN_STATEMENT:
      case NODE.FOR_IN_STATEMENT:
        const block = currentNode.body || currentNode.consequent;
        addScopeToTypeGraph(block, parentNode, typeGraph, currentNode);
        if (currentNode.alternate) {
          addScopeToTypeGraph(
            currentNode.alternate,
            parentNode,
            typeGraph,
            currentNode.alternate
          );
        }
        if (
          ![NODE.FOR_OF_STATEMENT, NODE.FOR_IN_STATEMENT].includes(
            currentNode.type
          )
        ) {
          refinement(
            currentNode,
            getParentForNode(block, parentNode, typeGraph),
            typeScope,
            typeGraph,
            errors
          );
        }
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
        const functionVariable = addFunctionToTypeGraph(
          currentNode,
          parentNode,
          typeGraph,
          precompute,
          middlecompute,
          postcompute,
          isTypeDefinitions
        );
        if (currentNode.exportAs) {
          // $FlowIssue In Flow VariableInfo<ObjectType> is incompatible with VariableInfo<Type> even if you don't mutate argument
          typeGraph.exports.set(currentNode.exportAs, functionVariable);
        }
        break;
      case NODE.BLOCK_STATEMENT:
        if (NODE.isFunction(parentNode) && parentNode.body === currentNode) {
          break;
        }
        addScopeToTypeGraph(currentNode, parentNode, typeGraph, currentNode);
        break;
      case NODE.OBJECT_METHOD:
      case NODE.CLASS_METHOD:
      case NODE.CLASS_PRIVATE_METHOD:
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
          typeGraph,
          undefined,
          "try"
        );
        tryBlock.throwable = [];
        typeGraph.scopes.set(
          VariableScope.getName(currentNode.block),
          tryBlock
        );
        if (!currentNode.handler) {
          return true;
        }
        const handlerScopeKey = VariableScope.getName(currentNode.handler.body);
        typeGraph.scopes.set(
          handlerScopeKey,
          getScopeFromNode(
            currentNode.handler.body,
            parentNode,
            typeGraph,
            undefined,
            "catch"
          )
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
      currentNode = currentNode.declaration || currentNode;
    }
    switch (currentNode.type) {
      case NODE.IMPORT_DECLARATION:
        errors.push(
          new HegelError(
            "All imports should be placed at the top of text document without any statements between.",
            currentNode.loc,
            typeGraph.path
          )
        );
        break;
      case NODE.INTERFACE_DECLARATION:
        if (isTypeDefinitions) {
          return;
        }
        errors.push(
          new HegelError(
            "Interfaces do not exist in Hegel. Use 'type alias' instead.",
            currentNode.loc,
            typeGraph.path
          )
        );
        break;
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
      case NODE.CLASS_PRIVATE_METHOD:
      case NODE.CLASS_PRIVATE_PROPERTY:
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
      case NODE.CLASS_DECLARATION:
      case NODE.TS_TYPE_ALIAS:
        if (currentNode.type === NODE.CLASS_DECLARATION && !isTypeDefinitions) {
          return;
        }
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
  return (
    currentNode: Node,
    parentNode: Node,
    precompute: Handler,
    middlecompute: Handler,
    postcompute: Handler,
    meta?: Object = {}
  ) => {
    if (
      currentNode.type === NODE.EXPORT_NAMED_DECLARATION ||
      currentNode.type === NODE.EXPORT_DEFAULT_DECLARATION
    ) {
      currentNode = currentNode.declaration;
    }
    const currentScope = getParentForNode(currentNode, parentNode, moduleScope);
    const typeScope = findNearestTypeScope(currentScope, moduleScope);
    switch (currentNode.type) {
      case NODE.OBJECT_EXPRESSION:
        const obj = addObjectToTypeGraph(currentNode, moduleScope);
        if (currentNode.exportAs) {
          moduleScope.exports.set(currentNode.exportAs, obj);
        }
        break;
      case NODE.CLASS_PROPERTY:
      case NODE.OBJECT_PROPERTY:
      case NODE.CLASS_PRIVATE_PROPERTY:
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
      case NODE.SWITCH_STATEMENT:
        findUnhandledCases(
          currentNode,
          errors,
          moduleScope,
          currentScope,
          parentNode,
          precompute,
          middlecompute,
          postcompute
        );
        break;
      case NODE.CLASS_DECLARATION:
      case NODE.CLASS_EXPRESSION:
        const classConstructor = addClassToTypeGraph(
          currentNode,
          typeScope,
          moduleScope,
          parentNode,
          precompute,
          middlecompute,
          postcompute,
          isTypeDefinitions
        );
        if (currentNode.exportAs) {
          // $FlowIssue In Flow VariableInfo<ObjectType> is incompatible with VariableInfo<Type> even if you don't mutate argument
          moduleScope.exports.set(currentNode.exportAs, classConstructor);
          moduleScope.exportsTypes.set(
            currentNode.exportAs,
            // $FlowIssue
            classConstructor.type.instanceType
          );
        }
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
      case NODE.EXPORT_LIST:
        const isTypeExport = currentNode.exportKind === "type";
        const specifiersSource = isTypeExport
          ? moduleScope.typeScope
          : moduleScope;
        const specifiersTarget = isTypeExport
          ? moduleScope.exportsTypes
          : moduleScope.exports;
        currentNode.specifiers.forEach(({ local, exported }) => {
          const existedVariableOrType =
            specifiersSource instanceof ModuleScope
              ? specifiersSource.findVariable(
                  local,
                  parentNode,
                  moduleScope,
                  precompute,
                  middlecompute,
                  postcompute
                )
              : specifiersSource.findTypeWithName(
                  local.name,
                  parentNode,
                  moduleScope,
                  precompute,
                  middlecompute,
                  postcompute
                );
          // $FlowIssue
          specifiersTarget.set(exported.name, existedVariableOrType);
        });
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
          currentNode.id.typeAnnotation == undefined &&
          currentNode.init !== null
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
        errorVariable.type = UnionType.term(null, {}, [
          Type.Unknown,
          errorVariable.type
        ]);
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
          postcompute,
          { isForInit: parentNode.kind === "constructor" }
        ).result;

        const invocationResultType =
          resultOfCall instanceof VariableInfo
            ? resultOfCall.type
            : resultOfCall;
        if (isSideEffectCall(currentNode, invocationResultType)) {
          const functionName =
            currentNode.expression.callee.name || "Anonymous Function";
          errors.push(
            new HegelError(
              `You use function "${functionName}" as side effect function, but it returns a ${String(
                invocationResultType.name
              )} type`,
              currentNode.loc,
              moduleScope.path
            )
          );
        }

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
      case NODE.CLASS_PRIVATE_METHOD:
      case NODE.FUNCTION_EXPRESSION:
      case NODE.ARROW_FUNCTION_EXPRESSION:
      case NODE.FUNCTION_DECLARATION:
        const functionScope = moduleScope.scopes.get(
          VariableScope.getName(currentNode)
        );
        if (functionScope === undefined) {
          throw new Error("Never!!!");
        }
        const { declaration } = functionScope;
        if (declaration === undefined) {
          throw new Error("Never!!!");
        }
        const declarationType: FunctionType | ObjectType =
          declaration.type instanceof GenericType
            ? declaration.type.subordinateType
            : declaration.type;
        if (declarationType instanceof ObjectType) {
          throw new Error("Never!!!");
        }
        if (
          !isTypeDefinitions &&
          (functionScope.throwable == undefined ||
            functionScope.throwable.length === 0) &&
          declarationType.throwable !== undefined
        ) {
          throw new HegelError(
            `Function should throw "${String(
              declarationType.throwable.name
            )}" but throws nothing`,
            currentNode.returnType
              ? currentNode.returnType.loc
              : currentNode.loc
          );
        }
        if (
          functionScope.throwable != undefined &&
          functionScope.throwable.length !== 0 &&
          declarationType.throwable === undefined
        ) {
          const throwableType = inferenceErrorType(currentNode, moduleScope);
          const fnName = FunctionType.getName(
            declarationType.argumentsTypes,
            declarationType.returnType,
            declaration.type instanceof GenericType
              ? declaration.type.genericArguments
              : [],
            declarationType.isAsync,
            throwableType
          );
          let newFunctionType = FunctionType.term(
            fnName,
            {},
            declarationType.argumentsTypes,
            declarationType.returnType,
            declarationType.isAsync
          );
          newFunctionType.throwable = throwableType;
          if (
            declaration.type instanceof GenericType &&
            newFunctionType instanceof FunctionType
          ) {
            newFunctionType = GenericType.new(
              fnName,
              {},
              declaration.type.genericArguments,
              declaration.type.localTypeScope,
              newFunctionType
            );
          }
          declaration.type = newFunctionType;
        }
        const fnType =
          functionScope.declaration && functionScope.declaration.type;
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
        if (currentNode.exportAs) {
          // $FlowIssue In Flow VariableInfo<ObjectType> is incompatible with VariableInfo<Type> even if you don't mutate argument
          moduleScope.exports.set(currentNode.exportAs, declaration);
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
      default:
        if (currentNode.exportAs) {
          const value = addCallToTypeGraph(
            currentNode,
            moduleScope,
            currentScope,
            parentNode,
            precompute,
            middlecompute,
            postcompute,
            { isTypeDefinitions }
          ).result;
          moduleScope.exports.set(
            currentNode.exportAs,
            value instanceof VariableInfo
              ? value
              : new VariableInfo(value, currentScope, new Meta(currentNode.loc))
          );
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
  file: File,
  globalErrors: Array<HegelError>,
  getModuleTypeGraph: (string, string, SourceLocation) => Promise<ModuleScope>,
  globalModule: ModuleScope,
  isTypeDefinitions: boolean,
  withPositions?: boolean = true
): Promise<ModuleScope> {
  const errors: IgnorableArray<HegelError> = IgnorableArray.withIgnoring(
    file.comments,
    file.path
  );
  const ast = file.program;
  const typeScope = new TypeScope(globalModule.typeScope);
  const module = new (withPositions ? PositionedModuleScope : ModuleScope)(
    file.path,
    new Map(),
    globalModule,
    typeScope
  );
  await mixImportedDependencies(
    ast,
    file.path,
    errors,
    module,
    typeScope,
    getModuleTypeGraph,
    isTypeDefinitions
  );
  traverseTree(
    ast,
    fillModuleScope(module, errors, isTypeDefinitions),
    middlefillModuleScope(module, errors, isTypeDefinitions),
    afterFillierActions(module, errors, isTypeDefinitions),
    null,
    { errors }
  );
  module.scopes.forEach(scope =>
    checkCalls(file.path, scope, typeScope, errors)
  );
  checkCalls(file.path, module, typeScope, errors);
  globalErrors.push(...errors);
  return module;
}

async function createGlobalScope(
  files: Array<File>,
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
  const globalModule = new ModuleScope("#global");
  Type.prettyMode = withPositions;
  setupBaseHierarchy(globalModule.typeScope);
  mixBaseGlobals(globalModule);
  mixUtilityTypes(globalModule);
  await mixTypeDefinitions(globalModule);
  setupFullHierarchy(globalModule.typeScope);
  mixBaseOperators(globalModule);
  const createDependencyModuleScope = (
    file: File,
    isTypeDefinitions: boolean
  ) =>
    createModuleScope(
      file,
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
    files.map(module =>
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
  dropAllGlobals();
  return [modules, errors, globalModule];
}

export default createGlobalScope;
