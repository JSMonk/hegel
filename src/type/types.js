// @flow
import type { SourceLocation } from "@babel/parser";

export const UNDEFINED_TYPE = "?";
export const TYPE_SCOPE = "[[TypeScope]]";

export type GraphElement = Scope | TypeInfo;

export type TypeGraph = Map<string, GraphElement>;

export class ModuleScope {
  body: TypeGraph = new Map();
  parent: void;
}

type TypeMeta = {
  isNullable?: boolean,
  isOptional?: boolean,
  isLiteral?: boolean
};

export class Type {
  name: mixed;
  isNullable: boolean;
  isOptional: boolean;
  isLiteral: boolean;

  constructor(name: mixed, meta?: TypeMeta = {}) {
    this.name = name;
    const { isLiteral = false, isOptional = false, isNullable = false } = meta;
    this.isOptional = isOptional;
    this.isNullable = isNullable;
    this.isLiteral = isLiteral;
  }
}

export class ObjectType extends Type {
  properties: Map<string, TypeInfo>;

  constructor(
    name: mixed,
    properties: Array<[string, TypeInfo]>,
    meta?: TypeMeta = {}
  ) {
    super(name, { ...meta, isLiteral: true });
    this.properties = new Map(properties);
  }
}

export class FunctionType extends Type {
  argumentsTypes: Array<Type>;
  returnType: Type;
  context: ?Type;

  constructor(name: string, argumentsTypes: Array<Type>, returnType: Type) {
    super(name, { isLiteral: true });
    this.argumentsTypes = argumentsTypes;
    this.returnType = returnType;
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

  constructor(
    type: $PropertyType<this, "type">,
    parent: ModuleScope | Scope,
    declaration?: TypeInfo
  ) {
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
  parent: ?Scope | ?ModuleScope;
  exactType: ?Type;
  meta: Meta;
  relatedTo: ?Map<string, TypeInfo>;

  constructor(
    type: Type,
    parent: ?Scope | ?ModuleScope,
    meta: Meta,
    relatedTo: ?Map<string, TypeInfo>
  ) {
    this.type = type;
    this.parent = parent;
    this.meta = meta;
    this.relatedTo = relatedTo;
  }
}
