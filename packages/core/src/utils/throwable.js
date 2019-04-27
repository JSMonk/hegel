// @flow
import { Type } from "../type-graph/types/type";
import { Scope } from "../type-graph/scope";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";

function findThrowableBlock(parentScope: Scope | ModuleScope): ?Scope {
  if (!parentScope || !(parentScope instanceof Scope)) {
    throw new Error("Never");
  }
  do {
    if (parentScope.throwable) {
      return parentScope;
    }
    parentScope = parentScope.parent;
  } while (parentScope !== null);
  return null;
}

export function addToThrowable(
  throwType: Type | VariableInfo,
  currentScope: Scope | ModuleScope
) {
  const throwableScope = findThrowableBlock(currentScope);
  if (
    !throwableScope ||
    !(currentScope instanceof Scope) ||
    !throwableScope.throwable
  ) {
    return;
  }
  throwableScope.throwable.push(throwType);
}
