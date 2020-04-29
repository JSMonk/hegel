const { convertRangeToLoc } = require("../utils/range");
const { PositionedModuleScope } = require("@hegel/core");

/**
 * Narrow scope to smaller one of objects, constructors, functions.
 */
function narrowDownTypes(scope, position) {
  if (scope instanceof PositionedModuleScope) {
    const cursorLocation = convertRangeToLoc(position);
    const variable = scope.getVarAtPosition({
      ...cursorLocation,
      column: cursorLocation.column - 1,
    });

    if (variable !== undefined) {
      const narrowedTypeBody = getNarrowedTypeForVariable(variable);
      return narrowedTypeBody !== null ? {
        // Signals that global tokens must not be included.
        parent: null,
        body: narrowedTypeBody
      } : scope;
    } else {
      return scope;
    }
  } else {
    return scope;
  }
}

function getNarrowedTypeForVariable(variable) {
  if (variable.type.properties !== null) {
    // Variable is instance of class or class|constructor itself.
    return variable.type.properties;
  } else if (
    variable.type.isSubtypeOf !== null &&
    variable.type.isSubtypeOf.properties !== null
  ) {
    // Variable is instance of global constructor.
    return variable.type.isSubtypeOf.properties;
  } else {
    return null;
  }
}

exports.narrowDownTypes = narrowDownTypes;