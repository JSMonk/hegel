

function onCompletionResolve(item) {
  item.detail = 'Type';
  item.documentation = 'JavaScript documentation';
  return item;
}

exports.onCompletionResolve = onCompletionResolve;