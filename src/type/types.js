// @flow
import type { SourceLocation } from "@babel/parser";

export type GraphElement = Scope | TypeInfo;

export type TypeGraph = Map<string, GraphElement>;

export class ModuleScope {
  body: TypeGraph = new Map();
}

export class Type {
  value: mixed;
  literal: boolean;
  
  constructor(value: mixed, literal?: boolean = false) {
    this.value = value;
    this.literal = literal;
  }
}

export class Scope {
  static BLOCK_TYPE = "block";
  static FUNCTION_TYPE = "function";
  static OBJECT_TYPE = "object";
  static CLASS_TYPE = "class";
  type: "block" | "function" | "object" | "class";
  parent: Scope | ModuleScope;
  body: TypeGraph = new Map();

  constructor(type: $PropertyType<this, "type">, parent: ModuleScope | Scope) {
    this.type = type;
    this.parent = parent;
  }
}

export class Meta {
  loc: SourceLocation;

  constructor(loc: SourceLocation) {
    this.loc = loc;
  }
}

export class TypeInfo {
  type: Type;
  parent: Scope | ModuleScope;
  exactType: ?string;
  meta: Meta 
  
  constructor(type: Type, parent: Scope | ModuleScope, meta: Meta) {
    this.type = type;
    this.parent = parent;
    this.meta = meta;
  }
}
