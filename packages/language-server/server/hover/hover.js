const { getTypeName } = require("../validation/typings");
const { convertRangeToLoc } = require("../utils/range");
const { PositionedModuleScope } = require("@hegel/core");
const { getPositionedModuleScopeTypes } = require("../validation/code_validation");

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

exports.onHover = onHover;