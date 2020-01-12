// @flow
import HegelError from "../utils/errors";
import traverseTree from "../utils/traverse";
import { VariableInfo } from "./variable-info";
import type { Type } from "./types/type";
import type { Handler } from "../utils/traverse";
import type { TypeGraph } from "./module-scope";
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
  ) {
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
      parentNode
    );
    const scope = typeGraph.body.get(scopeName);
    // $FlowIssue
    if (!(scope instanceof Scope) || scope.type !== "function") {
      return;
    }
    // $FlowIssue
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
  ): VariableInfo {
    let parent = this;
    do {
      const variableInfo = parent.body.get(name);
      if (variableInfo) {
        if (variableInfo instanceof VariableInfo) {
          if ("subordinateMagicType" in variableInfo.type && name !== ".") {
            const newType = (variableInfo.type: any).unpack();
            variableInfo.type = newType;
          }
          return variableInfo;
        }
        if (
          !(variableInfo instanceof Scope) &&
          Scope.canTraverseFunction(rest)
        ) {
          // $FlowIssue
          const result = Scope.addAndTraverseNodeWithType(
            // $FlowIssue
            undefined,
            variableInfo,
            ...rest
          );
          return result === undefined
            ? this.findVariable({ name, loc })
            : result;
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
    | VariableInfo
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
}
