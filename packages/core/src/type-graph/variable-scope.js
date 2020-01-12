// @flow
import { Scope } from "./scope";
import { VariableInfo } from "./variable-info";
import type { Type } from "./types/type";
import type { Handler } from "../utils/traverse";
import type { CallMeta } from "./meta/call-meta";
import type { TypeGraph } from "./module-scope";
import type { ModuleScope } from "./module-scope";

export type VariableScopeType = "block" | "function" | "object" | "class";

// $FlowIssue
export class VariableScope extends Scope {
  static BLOCK_TYPE = "block";
  static FUNCTION_TYPE = "function";
  static OBJECT_TYPE = "object";
  static CLASS_TYPE = "class";

  type: VariableScopeType;
  parent: ModuleScope | VariableScope;
  calls: Array<CallMeta> = [];
  throwable: Array<VariableInfo | Type> | void;
  declaration: VariableInfo | void;
  skipCalls: boolean;

  constructor(
    type: VariableScopeType,
    parent: ModuleScope | VariableScope,
    declaration?: VariableInfo,
    skipCalls?: boolean = false
  ) {
    super(parent);
    this.parent = parent;
    this.type = type;
    this.declaration = declaration;
    this.skipCalls = skipCalls;
  }
}
