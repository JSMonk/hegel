const { ObjectType } = require("@hegel/core/type-graph/types/object-type");
const { FunctionType } = require("@hegel/core/type-graph/types/function-type");
const { CompletionItemKind } = require("vscode-languageserver");
const {
  CONSTRUCTABLE,
  CALLABLE,
  THIS_TYPE,
} = require("@hegel/core/type-graph/constants");

/**
 * Find type kind of variable.
 */
function getCompletionKind(variableInfo) {
  if (
    variableInfo.type instanceof FunctionType ||
    variableInfo.type.subordinateType instanceof FunctionType
  ) {
    return variableInfo.parent !== null &&
      variableInfo.parent.body.has(THIS_TYPE)
      ? CompletionItemKind.Method
      : CompletionItemKind.Function;
  } else if (
    variableInfo.type instanceof ObjectType ||
    variableInfo.type.subordinateType instanceof ObjectType
  ) {
    if (
      variableInfo.type.properties.has(CONSTRUCTABLE) ||
      variableInfo.type.properties.has(CALLABLE)
    ) {
      return CompletionItemKind.Constructor;
    } else {
      if (
        variableInfo.type.classType === null &&
        variableInfo.type.instanceType === null
      ) {
        /** Math and Atomics objects. */
        return CompletionItemKind.Constant;
      } else {
        /** Classes have instanceType !== null, but instances have classType !== null. */
        return variableInfo.type.classType === null
          ? CompletionItemKind.Class
          : chooseVariableType(variableInfo);
      }
    }
  } else {
    return variableInfo.parent !== null &&
      variableInfo.parent.body.has(THIS_TYPE)
      ? CompletionItemKind.Field
      : chooseVariableType(variableInfo);
  }
}

function chooseVariableType(variableInfo) {
  return variableInfo.isConstant
    ? CompletionItemKind.Constant
    : CompletionItemKind.Variable;
}

exports.getCompletionKind = getCompletionKind;
