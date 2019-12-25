// @flow
import { Scope } from "../type-graph/scope";
import { POSITIONS } from "../type-graph/constants";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import type { Node, SourceLocation } from "@babel/parser";

export function addPosition(
  node: Node,
  variableInfo: VariableInfo,
  typeGraph: ModuleScope
) {
  const positions = typeGraph.body.get(POSITIONS);
  if (!(positions instanceof Scope)) {
    throw new Error("Never!");
  }
  const line: any = positions.body.get(node.loc.start.line) || new Map();
  line.set(`${node.loc.start.column},${node.loc.end.column}`, variableInfo);
  positions.body.set(node.loc.start.line, line);
}

export function getVarAtPosition(loc: SourceLocation, typeGraph: ModuleScope) {
  const positions = typeGraph.body.get(POSITIONS);
  if (!(positions instanceof Scope)) {
    throw new Error("Never!");
  }
  const line: ?Map<string, VariableInfo> = (positions.body.get(loc.line): any);
  if (!line) {
    return;
  }
  let varInfo = null;
  for (const [startEnd, vi] of line.entries()) {
    let [start, end] = startEnd.split(",");
    start = Number(start);
    end = Number(end);
    if (loc.column >= start && loc.column <= end) {
      varInfo = vi;
      break;
    }
  }
  return varInfo;
}
