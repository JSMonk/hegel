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
  const body =
    currentNode.body ||
    [currentNode.consequent, currentNode.test, currentNode.init].filter(
      Boolean
    );
  if (!body) {
    return;
  }
  const nextParent =
    parentNode &&
    ((NODE.isFunction(parentNode) &&
      currentNode.type === NODE.BLOCK_STATEMENT) ||
      (NODE.isScopeCreator(parentNode) && !NODE.isScopeCreator(currentNode)))
      ? parentNode
      : currentNode;
  if (Array.isArray(body)) {
    body.forEach(childNode => traverseTree(childNode, cb, nextParent));
  } else {
    traverseTree(body, cb, nextParent);
  }
};

export default traverseTree;
