let currentVariableName = '';

function onCompletionResolve(item) {
  currentVariableName = item.label;

  return {
    ...item,
    detail: 'Type',
    documentation: 'JavaScript documentation',
  };
}

function getCurrentVariableName() {
  return currentVariableName;
}

exports.onCompletionResolve = onCompletionResolve;
exports.getCurrentVariableName = getCurrentVariableName;