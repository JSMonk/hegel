const { EMPTY_SCOPE } = require("../constants");
const { convertRangeToLoc } = require("../utils/range");
const { PositionedModuleScope } = require("@hegel/core");
const { getCurrentVariableName } = require("./completion-resolve");

let currentVariableScope = undefined;

/**
 * Narrow scope to smaller one of objects, constructors, functions.
 */
function narrowDownTypes(scope, completionParams) {
  if (scope instanceof PositionedModuleScope) {
    const cursorLocation = convertRangeToLoc(completionParams.position);
    const variable =
      currentVariableScope === undefined
        ? scope.getVarAtPosition({
            ...cursorLocation,
            column: cursorLocation.column - 1,
          })
        : currentVariableScope.get(getCurrentVariableName());

    if (variable !== undefined) {
      currentVariableScope = getNarrowedTypeForVariable(variable);

      return {
        // Signals that global tokens must not be included.
        parent: null,
        body:
          currentVariableScope !== undefined ? currentVariableScope : new Map(),
      };
    } else {
      return EMPTY_SCOPE;
    }
  } else {
    return EMPTY_SCOPE;
  }
}

function getNarrowedTypeForVariable(variable) {
  return variable.type.properties !== undefined
    ? variable.type.properties
    : variable.type.isSubtypeOf !== null
    ? variable.type.isSubtypeOf.properties
    : undefined;
}

function discardVariableScope() {
  currentVariableScope = undefined;
}

exports.narrowDownTypes = narrowDownTypes;
exports.discardVariableScope = discardVariableScope;
