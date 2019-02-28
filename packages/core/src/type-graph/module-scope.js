// @flow
import type { Scope } from "./scope";
import type { CallMeta } from "./meta/call-meta";
import type { VariableInfo } from "./variable-info";

export type GraphElement = Scope | VariableInfo;
export type TypeGraph = Map<string, GraphElement>;

export class ModuleScope {
  body: TypeGraph;
  parent: void;
  calls: Array<CallMeta> = [];

  constructor(body?: TypeGraph = new Map()) {
    this.body = body;
  }
}
