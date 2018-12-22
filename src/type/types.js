// @flow
import type { SourceLocation } from "@babel/parser";

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
  isLiteral: boolean;
  isNullable: boolean;
  isOptional: boolean;
  properties: Map<string, TypeInfo>;

  constructor(
    name: mixed,
    meta?: TypeMeta = {},
    properties?: Array<[string, TypeInfo]> = []
  ) {
    const {
      isLiteral = false,
      isOptional = false,
      isNullable = false,
    } = meta;
    this.name = name;
    this.isLiteral = isLiteral;
    this.isOptional = isOptional;
    this.isNullable = isNullable;
    this.properties = new Map(properties);
  }
}

export class FunctionType extends Type {
  argumentsTypes: Array<Type>;
  returnType: Type;
  hoisted: boolean;
  context: ?Type;

  constructor(
    name: string,
    argumentsTypes: Array<Type>,
    returnType: Type,
    hoisted?: boolean = false,
    context?: ?Type
  ) {
    super(name);
    this.argumentsTypes = argumentsTypes;
    this.returnType = returnType;
    this.hoisted = hoisted;
    this.context = context;
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
  exactType: ?string;
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
