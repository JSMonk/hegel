// @flow
import { Scope } from "./scope";
import { TypeScope } from "./type-scope";
import type { Type } from "./types/type";
import type { CallMeta } from "./meta/call-meta";
import type { VariableInfo } from "./variable-info";
import type { VariableScope } from "./variable-scope";
import type {
  Node,
  ClassMethod,
  ObjectMethod,
  ClassProperty,
  ObjectProperty,
  SourceLocation,
  FunctionDeclaration
} from "@babel/core";

export type GraphElement =
  | ClassMethod
  | ObjectMethod
  | VariableInfo
  | VariableScope
  | ClassProperty
  | ObjectProperty
  | FunctionDeclaration;

export type TypeGraph = Map<string, GraphElement>;

// $FlowIssue
export class ModuleScope extends Scope {
  typeScope: TypeScope;
  parent: ModuleScope | null;
  calls: Array<CallMeta> = [];
  exports: Map<string, VariableInfo>;
  exportsTypes: Map<string, Type>;

  constructor(
    body?: TypeGraph = new Map(),
    parent?: ModuleScope | null = null,
    typeScope?: TypeScope = new TypeScope()
  ) {
    // $FlowIssue
    super(parent);
    this.parent = parent;
    this.body = body;
    this.typeScope = typeScope;
    this.exports = new Map();
    this.exportsTypes = new Map();
  }
}

export class PositionedModuleScope extends ModuleScope {
  positions: Map<string, Map<string, VariableInfo | Type>>;

  constructor(
    body?: TypeGraph = new Map(),
    parent?: ModuleScope,
    typeScope?: TypeScope = new TypeScope()
  ) {
    super(body, parent, typeScope);
    this.positions = new Map();
  }

  addPosition(node: Node, variableInfo: VariableInfo) {
    const line: any = this.positions.get(node.loc.start.line) || new Map();
    line.set(`${node.loc.start.column},${node.loc.end.column}`, variableInfo);
    this.positions.set(node.loc.start.line, line);
  }

  getVarAtPosition(loc: SourceLocation, typeGraph: ModuleScope) {
    const line: Map<string, VariableInfo | Type> | void = this.positions.get(
      loc.line
    );
    if (line === undefined) {
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
}
