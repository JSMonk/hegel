// @flow
import { Scope } from "./scope";
import type { Type } from "./types/type";
import type { Handler } from "../utils/traverse";
import type { CallMeta } from "./meta/call-meta";
import type { TypeGraph } from "./module-scope";
import type { ObjectType } from "./types/object-type";
import type { GenericType } from "./types/generic-type";
import type { ModuleScope } from "./module-scope";
import type { FunctionType } from "./types/function-type";
import type { VariableInfo } from "./variable-info";

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
  throwable: Array<VariableInfo<Type> | Type> | void;
  declaration: VariableInfo<ObjectType> | VariableInfo<FunctionType> | VariableInfo<GenericType<FunctionType>> | void;
  skipCalls: boolean;
  isProcessed: boolean = false;
  body: Map<string, VariableInfo<Type>>;
  creator: string | void;

  constructor(
    type: VariableScopeType,
    parent: ModuleScope | VariableScope,
    declaration?: VariableInfo<ObjectType> | VariableInfo<FunctionType> | VariableInfo<GenericType<FunctionType>>,
    creator?: string,
    skipCalls?: boolean = false
  ) {
    super(parent);
    this.parent = parent;
    this.type = type;
    this.declaration = declaration;
    this.skipCalls = skipCalls;
    this.creator = creator;
    this.body = new Map();
  }
}
