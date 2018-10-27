// @flow
import type { Node } from "@babel/parser";

type Tree =
  | Node
  | {
      body: Array<Node>
    };

const traverseTree = (
  currentNode: Tree,
  cb: (Tree, Tree) => void,
  parentNode: ?Tree = null
) => {
  cb(currentNode, parentNode);
  const body = currentNode.body ||  currentNode.consequent;
  if (!body) {
    return;
  }
  if (Array.isArray(body)) {
    body.forEach(childNode =>
      traverseTree(childNode, cb, currentNode)
    );
  } else {
    traverseTree(body, cb, currentNode)
  }
};

export default traverseTree;
