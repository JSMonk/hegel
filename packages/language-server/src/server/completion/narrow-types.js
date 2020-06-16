const { EMPTY_SCOPE } = require("../constants");
const { ModuleScope } = require("@hegel/core");
const { convertRangeToLoc } = require("../utils/range");
const { PositionedModuleScope } = require("@hegel/core");
const { getCurrentVariableName } = require("./completion-resolve");

let currentVariableScopeBody = null;

/**
 * Narrow scope to smaller one of objects, constructors, functions.
 */
function narrowDownTypes(scope, completionParams) {
  if (scope instanceof PositionedModuleScope) {
    const cursorLocation = convertRangeToLoc(completionParams.position);
    const variable =
      currentVariableScopeBody === null
        ? scope.getVarAtPosition({
            ...cursorLocation,
            column: cursorLocation.column - 1,
          })
        : currentVariableScopeBody.get(getCurrentVariableName());

    if (variable !== undefined) {
      currentVariableScopeBody = new Map(getVariableProperties(variable.type));

      return new ModuleScope("", currentVariableScopeBody);
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
  currentVariableScopeBody = null;
}

exports.narrowDownTypes = narrowDownTypes;
exports.discardVariableScope = discardVariableScope;
