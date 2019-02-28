// @flow
import type { Type } from "./types/type";
import type { Node } from "@babel/parser";
import type { CallMeta } from "./meta/call-meta";
import type { TypeGraph } from "./module-scope";
import type { ModuleScope } from "./module-scope";
import type { VariableInfo } from "./variable-info";

export type ScopeType = "block" | "function" | "object" | "class";

export class Scope {
  static BLOCK_TYPE = "block";
  static FUNCTION_TYPE = "function";
  static OBJECT_TYPE = "object";
  static CLASS_TYPE = "class";

  static getName(node: Node) {
    return `[[Scope${node.loc.start.line}-${node.loc.start.column}]]`;
  }

  type: ScopeType;
  parent: Scope | ModuleScope;
  body: TypeGraph = new Map();
  calls: Array<CallMeta> = [];
  throwable: ?Array<VariableInfo | Type>;
  declaration: ?VariableInfo;

  constructor(
    type: ScopeType,
    parent: ModuleScope | Scope,
    declaration?: VariableInfo
  ) {
    this.type = type;
    this.parent = parent;
    this.declaration = declaration;
  }
}
