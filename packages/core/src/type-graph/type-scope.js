// @flow
import { Type } from "./types/type";
import { Scope } from "./scope";
import type { Handler } from "../utils/traverse";
import type { ModuleScope } from "./module-scope";
import type { Node, TSInterfaceDeclaration } from "@babel/core";

export class TypeScope {
  static GLOBAL_SCOPE_PRIORITY = 0;
  static MODULE_SCOPE_PRIORITY = 1;

  priority: number;
  parent: TypeScope | null;
  body: Map<mixed, Type | TSInterfaceDeclaration> = new Map();

  constructor(
    parent?: TypeScope,
    priority?: number = parent === undefined
      ? TypeScope.GLOBAL_SCOPE_PRIORITY
      : parent.priority + 1
  ) {
    this.parent = parent === undefined ? null : parent;
    this.priority = priority;
  }

  makeCustom() {
    this.priority += 100;
  }

  findScopeWithType(type: Type) {
    let currentTypeScope = this;
    let existedType = undefined;
    while (currentTypeScope !== null) {
      existedType = currentTypeScope.body.get(type.name);
      if (existedType !== undefined && type === existedType) {
        return currentTypeScope;
      }
      currentTypeScope = currentTypeScope.parent;
    }
    return undefined;
  }

  findTypeWithName(
    name: mixed,
    ...rest: [] | [Node, ModuleScope, Handler, Handler, Handler]
  ): Type | void {
    let currentTypeScope = this;
    let existedType = undefined;
    while (currentTypeScope !== null) {
      existedType = currentTypeScope.body.get(name);
      if (existedType !== undefined) {
        if (existedType instanceof Type) {
          return Type.getTypeRoot(existedType);
        }
        if (Scope.canTraverseFunction(rest)) {
          // $FlowIssue
          let result = Scope.addAndTraverseNodeWithType(
            // $FlowIssue
            undefined,
            existedType,
            ...rest
          );
          result =
            result === undefined ? this.findTypeWithName(name) : result.type;
          if (result !== undefined) {
            return Type.getTypeRoot(result);
          }
        }
      }
      currentTypeScope = currentTypeScope.parent;
    }
    return undefined;
  }
}
