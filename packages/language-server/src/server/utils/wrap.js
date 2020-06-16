function wrapJSON(content) {
  return `export default ${content}`;
}

exports.wrapJSON = wrapJSON;