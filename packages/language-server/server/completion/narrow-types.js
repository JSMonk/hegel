const { EMPTY_SCOPE } = require("../constants");
const { convertRangeToLoc } = require("../utils/range");
const { PositionedModuleScope } = require("@hegel/core");
const { getCurrentVariableName } = require("./completion-resolve");

let currentVariableScope = null;

/**
 * Narrow scope to smaller one of objects, constructors, functions.
 */
function narrowDownTypes(scope, completionParams) {
  if (scope instanceof PositionedModuleScope) {
    const cursorLocation = convertRangeToLoc(completionParams.position);
    const variable =
      currentVariableScope === null
        ? scope.getVarAtPosition({
            ...cursorLocation,
            column: cursorLocation.column - 1,
          })
        : currentVariableScope.get(getCurrentVariableName());

    if (variable !== undefined) {
      currentVariableScope = new Map(getVariableProperties(variable.type));

      return {
        // Signals that global tokens must not be included.
        parent: null,
        body: currentVariableScope,
      };
    } else {
      return EMPTY_SCOPE;
    }
  } else {
    return EMPTY_SCOPE;
  }
}

function getVariableProperties(type) {
  if (type === null || type === undefined) {
    return [];
  }
  const currentTypeProperties =
    type.properties !== undefined ? type.properties.entries() : [];
  return [...currentTypeProperties, ...getVariableProperties(type.isSubtypeOf)];
}

function discardVariableScope() {
  currentVariableScope = null;
}

exports.narrowDownTypes = narrowDownTypes;
exports.discardVariableScope = discardVariableScope;
