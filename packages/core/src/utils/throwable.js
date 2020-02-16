// @flow
import { Type } from "../type-graph/types/type";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import { VariableScope } from "../type-graph/variable-scope";

export function findThrowableBlock(
  parentScope: null | VariableScope | ModuleScope
): ?VariableScope {
  if (!parentScope || !(parentScope instanceof VariableScope)) {
    return null;
  }
  let parent = parentScope;
  do {
    if (parent.throwable) {
      return parent;
    }
    parent = parent.parent;
  } while (parent !== null);
  return null;
}

export function addToThrowable(
  throwType: Type | VariableInfo,
  currentScope: null | VariableScope | ModuleScope
) {
  const throwableScope = findThrowableBlock(currentScope);
  if (
    !throwableScope ||
    !(currentScope instanceof VariableScope) ||
    !throwableScope.throwable
  ) {
    return;
  }
  throwableScope.throwable.push(throwType);
}
