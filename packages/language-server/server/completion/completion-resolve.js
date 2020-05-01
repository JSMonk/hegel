
/** TODO */
function onCompletionResolve(item) {
  return {
    ...item,
    detail: 'Type',
    documentation: 'JavaScript documentation',
  };
}

exports.onCompletionResolve = onCompletionResolve;