// @flow
import HegelError from "../utils/errors";
import traverseTree from "../utils/traverse";
import { VariableInfo } from "./variable-info";
import type { Type } from "./types/type";
import type { Handler } from "../utils/traverse";
import type { TypeGraph } from "./module-scope";
import type { ObjectType} from "./types/object-type";
import type { GenericType } from "./types/generic-type";
import type { FunctionType } from "./types/function-type";
import type { ModuleScope } from "./module-scope";
import type { VariableScope } from "./variable-scope";
import type {
  Node,
  ClassMethod,
  ObjectMethod,
  SourceLocation,
  FunctionDeclaration
} from "@babel/parser";

type Identifier = { name: string, loc?: SourceLocation };

export class Scope {
  static canTraverseFunction(
    rest: [] | [Node, ModuleScope, Handler, Handler, Handler]
  ) {
    return rest.length === 5;
  }

  static getName(node: Node) {
    return `[[Scope${node.loc.start.line}-${node.loc.start.column}]]`;
  }

  static addAndTraverseNodeWithType(
    definedType: Type | null,
    currentNode: Node,
    parentNode: Node,
    typeGraph: ModuleScope,
    precompute: Handler,
    middlecompute: Handler,
    postcompute: Handler
  ): VariableInfo<ObjectType> | VariableInfo<FunctionType> | VariableInfo<GenericType<FunctionType>> | void {
    currentNode.expected =
      definedType != undefined && "variants" in definedType
        ? // $FlowIssue
          definedType.variants.find(a => "argumentsTypes" in a)
        : definedType;
    const scopeName = this.getName(currentNode);
    traverseTree(
      currentNode,
      precompute,
      middlecompute,
      postcompute,
      parentNode.parentNode || parentNode
    );
    const scope = typeGraph.scopes.get(scopeName);
    // $FlowIssue
    if (scope === undefined || scope.type !== "function") {
      return;
    }
    const declaration = scope.declaration;
    if (!(declaration instanceof VariableInfo)) {
      throw new Error("Never!!!");
    }
    return declaration;
  }

  body: TypeGraph = new Map();
  parent: VariableScope | ModuleScope | null;

  constructor(parent: ModuleScope | VariableScope) {
    this.parent = parent;
  }

  findVariable(
    { name, loc }: Identifier,
    ...rest: [] | [Node, ModuleScope, Handler, Handler, Handler]
  ): VariableInfo<Type> {
    let parent = this;
    do {
      const variableInfo: VariableInfo<Type> | void = parent.body.get(name);
      if (variableInfo !== undefined) {
        if (variableInfo instanceof VariableInfo) {
          return variableInfo;
        }
        if (
          !(variableInfo instanceof Scope) &&
          Scope.canTraverseFunction(rest)
        ) {
          // $FlowIssue
          let result: VariableInfo<Type> | void = (Scope.addAndTraverseNodeWithType(
            // $FlowIssue
            undefined,
            variableInfo,
            ...rest
          ): any);
          if (result === undefined) {
            result = this.findVariable({ name, loc });
          }
          if (result !== undefined) {
            return result;
          }
        }
      }
      parent = parent.parent;
    } while (parent);
    throw new HegelError(`Variable "${name}" is not defined!`, loc);
  }

  findRecord({
    name,
    loc
  }: Identifier):
    | VariableInfo<Type>
    | FunctionDeclaration
    | ClassMethod
    | ObjectMethod {
    let parent = this;
    do {
      const recordInfo = parent.body.get(name);
      if (recordInfo && !(recordInfo instanceof Scope)) {
        return recordInfo;
      }
      parent = parent.parent;
    } while (parent);
    throw new HegelError(`Record "${name}" is not defined!`, loc);
  }

  isParentFor(scope: Scope) {
    let parent = scope;
    do {
      if (parent === this) {
        return true;
      }
      parent = parent.parent;
    } while (parent != null);
  }

  getParentsUntil(parent?: Scope) {
    const parents = [];
    let currentScope = this;
    do {
      parents.push(currentScope);
      currentScope = currentScope.parent;
    } while (currentScope !== null && currentScope !== parent);
    return parents;
  }

  getAllChildScopes(module: ModuleScope) {
    const children = [];
    for (const [_, scope] of module.scopes) {
      if (this.isParentFor(scope)) {
        children.push(scope);
      }
    }
    return children;
  }
}
