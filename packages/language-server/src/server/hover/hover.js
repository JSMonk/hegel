const { convertRangeToLoc } = require("../utils/range");
const { PositionedModuleScope } = require("@hegel/core");
const { getPositionedModuleScopeTypes } = require("../validation/code-validation");

function onHover(hoverParams) {
  const location = convertRangeToLoc(hoverParams.position);
  const types = getPositionedModuleScopeTypes();

  if (types instanceof PositionedModuleScope) {
    const varInfoOrType = types.getVarAtPosition(location);

    return varInfoOrType === undefined
      ? undefined
      : {
          contents: [
            {
              language: "typescript",
              value: getTypeName(varInfoOrType.type || varInfoOrType),
            },
          ],
        };
  }
}

function getTypeName(type) {
  return type.constraint !== undefined
    ? `${type.name}: ${type.constraint.name}`
    : String(type.name);
}

exports.onHover = onHover;