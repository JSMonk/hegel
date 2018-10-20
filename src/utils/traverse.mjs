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
  if (!currentNode.body) {
    return;
  }
  currentNode.body.forEach(childNode =>
    traverseTree(childNode, cb, currentNode)
  );
};

export default traverseTree;
