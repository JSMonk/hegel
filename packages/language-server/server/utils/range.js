function formatErrorRange(error) {
  const isSyntaxError = error instanceof SyntaxError;
  return {
    start: isSyntaxError
      ? { ...error.loc, line: error.loc.line - 1 }
      : convertLocToRange(error.loc.start),
    end: isSyntaxError
      ? { ...error.loc, column: 1000 }
      : convertLocToRange(error.loc.end),
  };
}

function convertLocToRange(loc) {
  return {
    line: loc.line - 1,
    character: loc.column,
  };
}

function convertRangeToLoc(range) {
  return {
    line: range.line + 1,
    column: range.character,
  };
}

exports.formatErrorRange = formatErrorRange;
exports.convertRangeToLoc = convertRangeToLoc;
