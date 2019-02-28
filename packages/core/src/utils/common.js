// @flow
import HegelError from "./errors";
import { VariableInfo } from "../type-graph/variable-info";
import type { Scope } from "../type-graph/scope";
import type { ModuleScope } from "../type-graph/module-scope";
import type { Node, Declaration, SourceLocation } from "@babel/parser";

export const getAnonymousKey = (node: Node) =>
  `[[Anonymuos${node.loc.start.line}-${node.loc.start.column}]]`;

export const getDeclarationName = (node: Declaration): string => node.id.name;

type Identifier = {
  name: string,
  loc?: SourceLocation
};

export function findVariableInfo(
  { name, loc }: Identifier,
  parentContext: ModuleScope | Scope
): VariableInfo {
  let parent = parentContext;
  do {
    const variableInfo = parent.body.get(name);
    if (variableInfo && variableInfo instanceof VariableInfo) {
      return variableInfo;
    }
    parent = parent.parent;
  } while (parent);
  throw new HegelError(`Variable "${name}" is not defined!`, loc);
}


export const compose = (fn: Function, ...fns: Array<Function>) => (
  ...args: Array<mixed>
) => fns.reduce((res, fn) => fn(res), fn(...args));
