// @flow
import type { Node } from "@babel/parser";
import NODE from "./nodes";

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
  const body = currentNode.body || currentNode.consequent;
  if (!body) {
    return;
  }
  if (Array.isArray(body)) {
    body.forEach(childNode =>
      traverseTree(
        childNode,
        cb,
        parentNode &&
        NODE.isFunction(parentNode) &&
        currentNode.type === NODE.BLOCK_STATEMENT
          ? parentNode
          : currentNode
      )
    );
  } else {
    traverseTree(body, cb, currentNode);
  }
};

export default traverseTree;
