import { parse } from "@babel/parser";
import { ObjectType } from "@hegel/core/type-graph/types/object-type";
import { GenericType } from "@hegel/core/type-graph/types/generic-type";
import { FunctionType } from "@hegel/core/type-graph/types/function-type";
import { THIS_TYPE, CONSTRUCTABLE } from "@hegel/core/type-graph/constants";
import {
  HegelError,
  VariableInfo,
  createModuleScope,
  createGlobalScope,
} from "@hegel/core";

let module = undefined;

const STANDARD_LIB_OPTIONS = { plugins: ["typescript"] };
const DEFAULT_OPTIONS = {
  plugins: [
    "bigInt",
    "classProperties",
    "numericSeparator",
    "classPrivateMethods",
    "classPrivateProperties",
    ["flow", { all: true }],
  ],
};
// eslint-disable-next-line
const STANDARD_AST = parse(STD_LIB_CONTENT, STANDARD_LIB_OPTIONS);

export function getTypeByLocation(location) {
  if (module === undefined) {
    return;
  }
  const varInfoOrType = module.getVarAtPosition(location);
  if (varInfoOrType === undefined) {
    return;
  }
  return varInfoOrType instanceof VariableInfo
    ? varInfoOrType.type
    : varInfoOrType;
}

let stdLibTypeGraph;

export async function mixTypeDefinitions(globalScope) {
  if (stdLibTypeGraph === undefined) {
    stdLibTypeGraph = await getStandardTypeDefinitions(globalScope);
  }
  const body = new Map(globalScope.body);
  for (const [name, variable] of stdLibTypeGraph.body.entries()) {
    variable.parent = globalScope;
    body.set(name, variable);
  }
  const typesBody = new Map(globalScope.typeScope.body);
  for (const [name, type] of stdLibTypeGraph.typeScope.body.entries()) {
    type.parent = globalScope.typeScope;
    typesBody.set(name, type);
  }
  globalScope.body = body;
  globalScope.typeScope.body = typesBody;
}

export async function getStandardTypeDefinitions(globalScope) {
  const errors = [];
  const graph = await createModuleScope(
    STANDARD_AST,
    errors,
    () => {},
    globalScope,
    true
  );
  if (errors.length > 0) {
    throw errors;
  }
  return graph;
}

export async function getDiagnostics(sourceCode) {
  let errors = [];
  try {
    const file = parse(sourceCode, DEFAULT_OPTIONS);
    [[module], errors] = await createGlobalScope(
      [file],
      () => {},
      false,
      mixTypeDefinitions,
      true
    );
  } catch (e) {
    const error = new HegelError(`AnalyzationError: ${e.message}`, {
      start: {
        line: 0,
        column: 0,
      },
      end: {
        line: Number.MAX_VALUE,
        column: Number.MAX_VALUE,
      },
    });
    errors = [error];
  }
  return errors.map(toTransferableObject);
}

/**
 * Summon and format completion items.
 * @param {import("monaco-editor").languages.CompletionItemKind} completionItemKind
 * @param {string} word - name of the variable before "." character.
 * @param {import("monaco-editor").languages.CompletionTriggerKind} triggerKind
 */
export function summonCompletionItems(completionItemKind, word, triggerKind) {
  if (module === undefined || module.body === undefined) {
    return [];
  }

  const moduleTypes = [
    ...module.body.entries(),
    ...stdLibTypeGraph.body.entries(),
  ];
  const types =
    triggerKind === 0 ? moduleTypes : narrowTypes(moduleTypes, word);

  return types.map(([varName, varInfo]) => ({
    label: varName,
    kind: getCompletionKind(varInfo, completionItemKind),
  }));
}

function narrowTypes(moduleTypes, word) {
  const outerType = moduleTypes.find(([varName, varInfo]) => varName === word);
  return outerType === null || outerType === undefined
    ? []
    : getVariableProperties(outerType[1].type);
}

function getVariableProperties(type) {
  if (type === null || type === undefined) {
    return [];
  }
  const currentTypeProperties =
    type.properties !== undefined ? type.properties.entries() : [];
  return [...currentTypeProperties, ...getVariableProperties(type.isSubtypeOf)];
}

/**
 * Find type kind of variable.
 */
function getCompletionKind(
  variableInfo,
  completionItemKind,
  isGeneric = false
) {
  const variableTypeProto = Reflect.getPrototypeOf(
    isGeneric ? variableInfo.type.subordinateType : variableInfo.type
  );
  switch (variableTypeProto.constructor) {
    case FunctionType:
      return getFunctionKind(variableInfo, completionItemKind);
    case ObjectType:
      return getObjectKind(variableInfo, completionItemKind);
    case GenericType:
      return getCompletionKind(variableInfo, completionItemKind, true);
    default:
      return getPropertyKind(variableInfo, completionItemKind);
  }
}

function getObjectKind(variableInfo, completionItemKind) {
  return isVariableInstanceProperty(variableInfo)
    ? completionItemKind.Field
    : variableInfo.type.properties.has(CONSTRUCTABLE)
    ? completionItemKind.Constructor
    : variableInfo.type.classType === null
    ? completionItemKind.Class
    : getVariableKind(variableInfo, completionItemKind);
}

function getFunctionKind(variableInfo, completionItemKind) {
  return isVariableInstanceProperty(variableInfo)
    ? completionItemKind.Method
    : completionItemKind.Function;
}

function getPropertyKind(variableInfo, completionItemKind) {
  return isVariableInstanceProperty(variableInfo)
    ? completionItemKind.Field
    : getVariableKind(variableInfo, completionItemKind);
}

function getVariableKind(variableInfo, completionItemKind) {
  return variableInfo.isConstant
    ? completionItemKind.Constant
    : completionItemKind.Variable;
}

function isVariableInstanceProperty(variableInfo) {
  return (
    variableInfo.parent !== null && variableInfo.parent.body.has(THIS_TYPE)
  );
}

function toTransferableObject(error) {
  const loc = error.loc;
  return {
    message: error.message,
    source: error.source,
    loc: loc && formatLoc(loc),
  };
}

function formatLoc(loc) {
  return loc.start
    ? {
        start: { line: loc.start.line, column: loc.start.column },
        end: { line: loc.end.line, column: loc.end.column },
      }
    : {
        start: { line: loc.line, column: loc.column },
        end: { line: loc.line, column: loc.column + 1 },
      };
}
