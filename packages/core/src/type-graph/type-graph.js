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
import { Scope } from "./scope";
import { UnionType } from "./types/union-type";
import { refinement } from "../inference/refinement";
import { addPosition } from "../utils/position-utils";
import { GenericType } from "./types/generic-type";
import { ModuleScope } from "./module-scope";
import { FunctionType } from "./types/function-type";
import { VariableInfo } from "./variable-info";
import { inferenceClass } from "../inference/class-inference";
import { getScopeFromNode } from "../utils/scope-utils";
import { findVariableInfo } from "../utils/common";
import { inferenceErrorType } from "../inference/error-type";
import { addCallToTypeGraph } from "./call";
import { inferenceTypeForNode } from "../inference";
import { getDeclarationName, getAnonymousKey } from "../utils/common";
import { getTypeFromTypeAnnotation, createSelf } from "../utils/type-utils";
import { POSITIONS, SELF, TYPE_SCOPE, UNDEFINED_TYPE } from "./constants";
import {
  getVariableType,
  getVariableInfoFromDelcaration
} from "../utils/variable-utils";
import {
  getInvocationType,
  inferenceFunctionTypeByScope
} from "../inference/function-type";
import {
  getParentForNode,
  addScopeToTypeGraph,
  findNearestTypeScope
} from "../utils/scope-utils";
import type { TraverseMeta } from "../utils/traverse";
import type { Node, Program } from "@babel/parser";
import type { CallableArguments } from "./meta/call-meta";

const addVariableToGraph = (
  currentNode: Node,
  parentNode: ?Node,
  typeGraph: ModuleScope,
  customName?: string = getDeclarationName(currentNode)
) => {
  const variableInfo = getVariableInfoFromDelcaration(
    currentNode,
    parentNode,
    typeGraph
  );
  variableInfo.parent.body.set(customName, variableInfo);
  return variableInfo;
};

export const addFunctionScopeToTypeGraph = (
  currentNode: Node,
  parentNode: Node | Scope | ModuleScope,
  typeGraph: ModuleScope,
  variableInfo: VariableInfo
) => {
  const scope = getScopeFromNode(
    currentNode,
    parentNode,
    typeGraph,
    variableInfo
  );
  scope.throwable = [];
  typeGraph.body.set(Scope.getName(currentNode), scope);
  if (currentNode.type === NODE.FUNCTION_EXPRESSION && currentNode.id) {
    scope.body.set(getDeclarationName(currentNode), variableInfo);
  }
  return scope;
};

const addFunctionToTypeGraph = (
  currentNode: Node,
  parentNode: Node,
  typeGraph: ModuleScope
) => {
  const name = currentNode.id
    ? getDeclarationName(currentNode)
    : getAnonymousKey(currentNode);
  const variableInfo = addVariableToGraph(
    currentNode,
    parentNode,
    typeGraph,
    name
  );
  const currentTypeScope = findNearestTypeScope(variableInfo.parent, typeGraph);
  const scope = addFunctionScopeToTypeGraph(
    currentNode,
    parentNode,
    typeGraph,
    variableInfo
  );
  variableInfo.type = inferenceTypeForNode(
    currentNode,
    currentTypeScope,
    variableInfo.parent,
    typeGraph
  );
  const functionType =
    variableInfo.type instanceof GenericType
      ? variableInfo.type.subordinateType
      : variableInfo.type;
  currentNode.params.forEach((param, index) => {
    let type = (functionType: any).argumentsTypes[index];
    if (param.left !== undefined && param.left.typeAnnotation === undefined) {
      const types = (type.variants: any).filter(a => a.name !== "undefined");
      type = UnionType.createTypeWithName(
        UnionType.getName(types),
        currentTypeScope,
        types
      );
    }
    const id = param.left || param;
    let varInfo = scope.body.get(id.name);
    if (varInfo !== undefined) {
      varInfo.type = type;
    } else {
      varInfo = new VariableInfo(type, scope, new Meta(id.loc));
      scope.body.set(id.name, varInfo);
    }
    addPosition(id, varInfo, typeGraph);
  });
  if (currentNode.id) {
    addPosition(currentNode.id, variableInfo, typeGraph);
  }
};

const hasTypeParams = (node: Node): boolean =>
  node.typeParameters &&
  node.typeParameters.type === NODE.TYPE_PARAMETER_DECLARATION &&
  Array.isArray(node.typeParameters.params) &&
  node.typeParameters.params.length !== 0;

const getGenericNode = (node: Node): ?Node => {
  if (hasTypeParams(node)) {
    return node;
  }
  if (node.right && hasTypeParams(node.right)) {
    return node.right;
  }
  return null;
};

const addClassToTypeGraph = (
  classNode: Node,
  typeScope: Scope,
  parentScope: Scope | ModuleScope,
  typeGraph: ModuleScope
) => {
  const classType = inferenceClass(
    classNode,
    typeScope,
    parentScope,
    typeGraph
  );
  const constructor: any = classType.properties.get("constructor") || {
    type: new FunctionType("", [], classType)
  };
  constructor.type.returnType = classType;
  constructor.type.name = classType.name;
  const variableInfo = new VariableInfo(
    constructor.type,
    parentScope,
    new Meta(classNode.loc)
  );
  parentScope.body.set(String(classType.name), variableInfo);
};

const addTypeAlias = (node: Node, typeGraph: ModuleScope) => {
  const typeScope = typeGraph.body.get(TYPE_SCOPE);
  if (typeScope === undefined || !(typeScope instanceof Scope)) {
    throw new Error(
      "Type scope should be presented before type alias has been met"
    );
  }
  const genericNode = getGenericNode(node);
  const localTypeScope = new Scope(Scope.BLOCK_TYPE, typeScope);
  const typeName = node.id.name;
  const self = createSelf(node, localTypeScope);
  localTypeScope.body.set(typeName, self);
  const genericArguments =
    genericNode &&
    genericNode.typeParameters.params.map(typeAnnotation =>
      getTypeFromTypeAnnotation({ typeAnnotation }, localTypeScope, typeGraph)
    );
  const type = getTypeFromTypeAnnotation(
    { typeAnnotation: node.right },
    localTypeScope,
    typeGraph,
    false,
    self.type
  );
  const typeFor = genericArguments
    ? GenericType.createTypeWithName(
        node.id.name,
        typeScope,
        genericArguments,
        localTypeScope,
        type
      )
    : type;
  self.type.constraint = typeFor;
  const typeAlias = new VariableInfo(typeFor, typeScope, new Meta(node.loc));
  typeScope.body.set(typeName, typeAlias);
  if (node.exportAs) {
    typeGraph.exportsTypes.set(node.exportAs, typeAlias);
  }
};

const fillModuleScope = (typeGraph: ModuleScope, errors: Array<HegelError>) => {
  const typeScope = typeGraph.body.get(TYPE_SCOPE);
  if (!typeScope || !(typeScope instanceof Scope)) {
    throw new Error("Type scope is not a scope.");
  }
  return (currentNode: Node, parentNode: Node, meta?: TraverseMeta = {}) => {
    switch (currentNode.type) {
      case NODE.TYPE_ALIAS:
        addTypeAlias(currentNode, typeGraph);
        break;
      case NODE.VARIABLE_DECLARATOR:
        addVariableToGraph(
          Object.assign(currentNode, meta),
          parentNode,
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
        break;
      case NODE.OBJECT_METHOD:
      case NODE.CLASS_METHOD:
      case NODE.FUNCTION_EXPRESSION:
      case NODE.ARROW_FUNCTION_EXPRESSION:
      case NODE.FUNCTION_DECLARATION:
        addFunctionToTypeGraph(currentNode, parentNode, typeGraph);
        break;
      case NODE.BLOCK_STATEMENT:
        if (NODE.isFunction(parentNode)) {
          break;
        }
        addScopeToTypeGraph(currentNode, parentNode, typeGraph);
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
          return;
        }
        const handlerScopeKey = Scope.getName(currentNode.handler.body);
        typeGraph.body.set(
          handlerScopeKey,
          getScopeFromNode(currentNode.handler.body, parentNode, typeGraph)
        );
        if (!currentNode.handler.param) {
          return;
        }
        addVariableToGraph(
          currentNode.handler.param,
          currentNode.handler.body,
          typeGraph,
          currentNode.handler.param.name
        );
        break;
      case NODE.IMPORT_DECLARATION:
        break;
    }
  };
};

const afterFillierActions = (
  path: string,
  typeGraph: ModuleScope,
  errors: Array<HegelError>
) => {
  const typeScope = typeGraph.body.get(TYPE_SCOPE);
  if (!typeScope || !(typeScope instanceof Scope)) {
    throw new Error("Type scope is not a scope.");
  }
  return (
    currentNode: Node,
    parentNode: Node | Scope | ModuleScope,
    meta?: Object = {}
  ) => {
    const currentScope = getParentForNode(currentNode, parentNode, typeGraph);
    switch (currentNode.type) {
      case NODE.CLASS_DECLARATION:
      case NODE.CLASS_EXPRESSION:
        addClassToTypeGraph(currentNode, typeScope, currentScope, typeGraph);
        break;
      case NODE.VARIABLE_DECLARATOR:
        const variableInfo = findVariableInfo(currentNode.id, currentScope);
        const newTypeOrVar = addCallToTypeGraph(
          currentNode,
          typeGraph,
          currentScope
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
          )
        );
        errorVariable.type = inferenceErrorType(currentNode, typeGraph);
        addPosition(currentNode.catchBlock.param, errorVariable, typeGraph);
        break;
      case NODE.IF_STATEMENT:
      case NODE.CALL_EXPRESSION:
      case NODE.RETURN_STATEMENT:
      case NODE.EXPRESSION_STATEMENT:
      case NODE.WHILE_STATEMENT:
      case NODE.DO_WHILE_STATEMENT:
      case NODE.FOR_STATEMENT:
      case NODE.THROW_STATEMENT:
        const resultOfCall = addCallToTypeGraph(
          currentNode,
          typeGraph,
          currentScope
        ).result;
        if (currentNode.exportAs) {
          typeGraph.exports.set(currentNode.exportAs, resultOfCall);
        }
        break;
      case NODE.OBJECT_METHOD:
      case NODE.FUNCTION_EXPRESSION:
      case NODE.ARROW_FUNCTION_EXPRESSION:
      case NODE.FUNCTION_DECLARATION:
        const functionScope = typeGraph.body.get(Scope.getName(currentNode));
        if (!(functionScope instanceof Scope)) {
          throw new Error("Never!");
        }
        if (functionScope.declaration instanceof VariableInfo) {
          if (
            functionScope.declaration.type instanceof GenericType &&
            functionScope.type === Scope.FUNCTION_TYPE &&
            functionScope.declaration.type.subordinateType instanceof
              FunctionType
          ) {
            // $FlowIssue - Type refinements
            inferenceFunctionTypeByScope(functionScope, typeGraph);
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
        checkCalls(path, functionScope, typeScope, errors, currentNode.loc);
        break;
      default:
        if (currentNode.exportAs) {
          typeGraph.exports.set(
            currentNode.exportAs,
            inferenceTypeForNode(currentNode, typeScope, parentNode, typeGraph)
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
  path: string,
  ast: Program,
  errors: Array<HegelError>,
  getModuleTypeGraph: (string, string) => Promise<ModuleScope>,
  globalModule: ModuleScope
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
      fillModuleScope(module, errors),
      afterFillierActions(path, module, errors)
    );
  } catch (e) {
    if (!(e instanceof HegelError)) {
      throw e;
    }
    e.source = path;
    errors.push(e);
  }
  checkCalls(path, module, typeScope, errors);
  return module;
}

async function createGlobalScope(
  ast: Array<Program>,
  getModuleAST: (string, string) => Promise<Program>
): Promise<[Array<ModuleScope>, Array<HegelError>, ModuleScope]> {
  const errors: Array<HegelError> = [];
  const globalModule = new ModuleScope();
  const globalTypeScope = new Scope("block", globalModule);
  globalModule.body.set(TYPE_SCOPE, globalTypeScope);
  globalModule.body.set(POSITIONS, new Scope("block", globalModule));
  mixUtilityTypes(globalModule);
  mixBaseGlobals(globalModule);
  mixBaseOperators(globalModule);
  const getModuleFromString = async (path: string, currentPath: string) => {
    const ast = await getModuleAST(path, currentPath);
    return createModuleScope(
      ast.path,
      ast,
      errors,
      getModuleFromString,
      globalModule
    );
  };
  const modules = await Promise.all(
    ast.map(module =>
      createModuleScope(
        module.path,
        module,
        errors,
        getModuleFromString,
        globalModule
      )
    )
  );
  return [modules, errors, globalModule];
}

export default createGlobalScope;
