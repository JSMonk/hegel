// @flow
import type { SourceLocation } from "@babel/parser";

export type GraphElement = Scope | TypeInfo;

export type TypeGraph = Map<string, GraphElement>;

export class ModuleScope {
  body: TypeGraph = new Map();
  parent: void;
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
  declaration: ?TypeInfo;

  constructor(type: $PropertyType<this, "type">, parent: ModuleScope | Scope, declaration?: TypeInfo) {
    this.type = type;
    this.parent = parent;
    this.declaration = declaration;
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
  relatedTo: ?Map<string, TypeInfo>;
  
  constructor(type: Type, parent: Scope | ModuleScope, meta: Meta, relatedTo: ?Map<string, TypeInfo>) {
    this.type = type;
    this.parent = parent;
    this.meta = meta;
    this.relatedTo = relatedTo;
  }
}
