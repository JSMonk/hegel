const {
  ObjectType,
} = require("@hegel/core/build/type-graph/types/object-type");
const {
  GenericType,
} = require("@hegel/core/build/type-graph/types/generic-type");
const {
  FunctionType,
} = require("@hegel/core/build/type-graph/types/function-type");
const { CompletionItemKind } = require("vscode-languageserver");
const {
  THIS_TYPE,
  CONSTRUCTABLE,
} = require("@hegel/core/build/type-graph/constants");

/**
 * Find type kind of variable.
 */
function getCompletionKind(variableInfo, isGeneric = false) {
  const variableTypeProto = Reflect.getPrototypeOf(
    isGeneric ? variableInfo.type.subordinateType : variableInfo.type
  );
  switch (variableTypeProto.constructor) {
    case FunctionType:
      return getFunctionKind(variableInfo);
    case ObjectType:
      return getObjectKind(variableInfo);
    case GenericType:
      return getCompletionKind(variableInfo, true);
    default:
      return getPropertyKind(variableInfo);
  }
}

function getObjectKind(variableInfo) {
  return isVariableInstanceProperty(variableInfo)
    ? CompletionItemKind.Field
    : variableInfo.type.properties.has(CONSTRUCTABLE)
    ? CompletionItemKind.Constructor
    : variableInfo.type.classType === null
    ? CompletionItemKind.Class
    : getVariableKind(variableInfo);
}

function getFunctionKind(variableInfo) {
  return isVariableInstanceProperty(variableInfo)
    ? CompletionItemKind.Method
    : CompletionItemKind.Function;
}

function getPropertyKind(variableInfo) {
  return isVariableInstanceProperty(variableInfo)
    ? CompletionItemKind.Field
    : getVariableKind(variableInfo);
}

function getVariableKind(variableInfo) {
  return variableInfo.isConstant
    ? CompletionItemKind.Constant
    : CompletionItemKind.Variable;
}

function isVariableInstanceProperty(variableInfo) {
  return (
    variableInfo.parent !== null && variableInfo.parent.body.has(THIS_TYPE)
  );
}

exports.getCompletionKind = getCompletionKind;
