import { SourceLocation, ExtendedSyntaxError } from "@babel/parser";

class Meta {
  loc: SourceLocation;
  changed: boolean;
}

class Scope {
  body: TypeGraph;
}

type TypeGraph = Map<string, VariableInfo>;

export class TypeScope {
  priority: number;
  body: Map<unknown, Type>;
}

type VariableScopeType = "block" | "function" | "object" | "class";

export class VariableScope extends Scope {
  type: VariableScopeType;
  throwable: Array<VariableInfo | Type> | void;
  declaration: VariableInfo | void;
  skipCalls: boolean;
  isProcessed: boolean;
  body: Map<string, VariableInfo>;
}

export class ModuleScope extends Scope {
  typeScope: TypeScope;
  parent: Scope | null;
  exports: Map<string, VariableInfo>;
  exportsTypes: Map<string, Type>;
  scopes: Map<string, VariableScope>;
}

export class PositionedModuleScope extends ModuleScope {
  positions: Map<string, Map<string, VariableInfo | Type>>;
}

export class Type {
  name: unknown;
  parent: TypeScope;
}

export class VariableInfo {
  type: Type;
  isConstant: boolean;
  hasInitializer: boolean;
  meta: Meta;
  parent: VariableScope | ModuleScope;
}

export interface ExtendedProgram extends Program {
  path: string;
}

type GraphCreator = (
  ast: ExtendedProgram,
  isTypeDefinitions: boolean
) => Promise<ModuleScope>;
type ImportFunction = (
  path: string,
  currentPath: string,
  loc: SourceLocation,
  graphCreator: GraphCreator
) => Promise<ModuleScope>;

type ModuleTypeGraphGetter = (
  path: string,
  currentPath: string,
  loc: SourceLocation
) => Promise<ModuleScope>;

type EmptyFunction = () => undefined;

export class HegelError extends Error {
  loc: SourceLocation;
  source: string;
  constructor(message: string, loc: SourceLocation);
}

export function createModuleScope(
  ast: ExtendedProgram,
  errors: Array<HegelError>,
  getModuleTypeGraph: ModuleTypeGraphGetter | EmptyFunction,
  globalModule: ModuleScope,
  isTypeDefinitions: boolean,
  withPositions?: boolean
): $Throws<Promise<ModuleScope | PositionedModuleScope>, ExtendedSyntaxError>;

export function createGlobalScope(
  ast: Array<ExtendedProgram>,
  getModuleTypeGraph: ImportFunction,
  isTypeDefinitions: boolean,
  mixTypeDefinitions: (module: ModuleScope) => undefined | Promise<undefined>,
  withPositions?: boolean
): $Throws<
  Promise<
    [Array<ModuleScope | PositionedModuleScope>, Array<HegelError>, ModuleScope]
  >,
  ExtendedSyntaxError
>;
