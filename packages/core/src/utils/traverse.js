// @flow
import NODE from "./nodes";
import HegelError, { UnreachableError } from "./errors";
import type { Node, Declaration, Block, SourceLocation } from "@babel/parser";

type Tree =
  | Node
  | {
      body: Array<Node> | Node,
      kind?: ?string,
      loc: SourceLocation
    };

export type TraverseMeta = {
  kind?: ?string
};

export const compose = (...fns: Array<Function>) => (...args: Array<any>) => {
  const additionalArgs = args.slice(1);
  return fns.reduce((res, fn) => fn(res, ...additionalArgs), args[0]);
};

function mixBodyToArrowFunctionExpression(currentNode: Node) {
  if (
    currentNode.type !== NODE.ARROW_FUNCTION_EXPRESSION ||
    currentNode.body.type === NODE.BLOCK_STATEMENT
  ) {
    return currentNode;
  }
  currentNode.body = {
    type: NODE.BLOCK_STATEMENT,
    body: [
      {
        type: NODE.RETURN_STATEMENT,
        argument: currentNode.body,
        loc: currentNode.body.loc
      }
    ],
    loc: currentNode.body.loc
  };
  return currentNode;
}

function sortClassMembers(currentNode: Node) {
  if (
    currentNode.type !== NODE.CLASS_DECLARATION ||
    currentNode.type !== NODE.CLASS_EXPRESSION
  ) {
    return currentNode;
  }
  currentNode.body.body.sort((a, b) => a.kind === "constructor" ? -1 : 1);
  return currentNode;
}

function mixBlockToLogicalOperator(currentNode: Node) {
  if (
    currentNode.type !== NODE.LOGICAL_EXPRESSION ||
    (currentNode.operator !== "&&" && currentNode.operator !== "||") ||
    currentNode.left.type === NODE.BLOCK_STATEMENT
  ) {
    return currentNode;
  }
  currentNode.left = {
    type: NODE.BLOCK_STATEMENT,
    body: currentNode.left,
    loc: {
      start: currentNode.loc.start,
      end: currentNode.loc.start
    }
  };
  currentNode.right = {
    type: NODE.BLOCK_STATEMENT,
    body: currentNode.right,
    loc: {
      start: currentNode.loc.end,
      end: currentNode.loc.end
    }
  };
  return currentNode;
}

function mixBlockToConditionalExpression(currentNode: Node) {
  if (
    currentNode.type !== NODE.CONDITIONAL_EXPRESSION ||
    currentNode.consequent.type === NODE.BLOCK_STATEMENT
  ) {
    return currentNode;
  }
  currentNode.consequent = {
    type: NODE.BLOCK_STATEMENT,
    body: currentNode.consequent,
    loc: {
      start: currentNode.loc.start,
      end: currentNode.loc.start
    }
  };
  currentNode.alternate = {
    type: NODE.BLOCK_STATEMENT,
    body: currentNode.alternate,
    loc: {
      start: currentNode.loc.end,
      end: currentNode.loc.end
    }
  };
  return currentNode;
}

function mixBlockForStatements(currentNode: Node) {
  if (
    currentNode.type !== NODE.IF_STATEMENT &&
    currentNode.type !== NODE.WHILE_STATEMENT &&
    currentNode.type !== NODE.FOR_STATEMENT &&
    currentNode.type !== NODE.FOR_IN_STATEMENT &&
    currentNode.type !== NODE.FOR_OF_STATEMENT
  ) {
    return currentNode;
  }
  if (
    currentNode.type === NODE.IF_STATEMENT &&
    currentNode.alternate &&
    currentNode.alternate.type !== NODE.BLOCK_STATEMENT
  ) {
    currentNode.alternate = {
      type: NODE.BLOCK_STATEMENT,
      body: [currentNode.alternate],
      loc: currentNode.alternate.loc
    };
  }
  const propertyName =
    currentNode.type === NODE.IF_STATEMENT ? "consequent" : "body";
  if (currentNode[propertyName].type === NODE.BLOCK_STATEMENT) {
    return currentNode;
  }
  currentNode[propertyName] = {
    type: NODE.BLOCK_STATEMENT,
    body: [currentNode[propertyName]],
    loc: currentNode[propertyName].loc
  };
  return currentNode;
}

function getInitFor(node) {
  switch (node.type) {
    case NODE.FOR_IN_STATEMENT:
      return { type: NODE.PURE_KEY, of: node.right };
    case NODE.FOR_OF_STATEMENT:
      return { type: NODE.VALUE, of: node.right };
    default:
      return;
  }
}

function mixBlockToCaseStatement(currentNode: Node) {
  if (currentNode.type !== NODE.SWITCH_STATEMENT) {
    return currentNode;
  }
  for (let i = 0; i < currentNode.cases.length; i++) {
    const $case = currentNode.cases[i];
    const body = $case.consequent.body || $case.consequent;
    $case.parent = currentNode;
    $case.consequent = {
      type: NODE.BLOCK_STATEMENT,
      loc: $case.loc,
      body
    };
  }
  return currentNode;
}

function mixDeclarationsInideForBlock(currentNode: Node) {
  if (
    currentNode.type !== NODE.FOR_IN_STATEMENT &&
    currentNode.type !== NODE.FOR_OF_STATEMENT &&
    (currentNode.type !== NODE.FOR_STATEMENT || currentNode.init === null)
  ) {
    return currentNode;
  }
  if (currentNode.body.type === NODE.EMPTY_STATEMENT) {
    currentNode.body = {
      type: NODE.BLOCK_STATEMENT,
      body: [],
      loc: currentNode.init.loc
    };
  }
  currentNode.body.body.unshift(
    currentNode.init || {
      ...currentNode.left,
      init: getInitFor(currentNode)
    }
  );
  return currentNode;
}

function mixExportInfo(currentNode: Node) {
  if (
    currentNode.type !== NODE.EXPORT_NAMED_DECLARATION &&
    currentNode.type !== NODE.EXPORT_DEFAULT_DECLARATION
  ) {
    return currentNode;
  }
  return currentNode.declaration.type !== NODE.VARIABLE_DECLARATION
    ? {
        ...currentNode.declaration,
        exportAs:
          currentNode.type === NODE.EXPORT_DEFAULT_DECLARATION
            ? "default"
            : currentNode.declaration.id.name
      }
    : {
        ...currentNode.declaration,
        declarations: currentNode.declaration.declarations.map(declaration => ({
          ...declaration,
          exportAs: declaration.id.name
        }))
      };
}

function mixTryCatchInfo(currentNode: Node) {
  if (currentNode.type !== NODE.TRY_STATEMENT) {
    return currentNode;
  }
  return {
    ...currentNode,
    block: {
      ...currentNode.block,
      catchBlock: currentNode.handler
    }
  };
}

function mixParentToClassObjectAndFunction(
  currentNode: Node,
  parentNode: Node
) {
  if (
    typeof currentNode === "object" &&
    currentNode !== null &&
    (currentNode.type === NODE.CLASS_DECLARATION ||
      currentNode.type === NODE.FUNCITON_DECLARATION)
  ) {
    currentNode.parentNode = parentNode;
  }
  return currentNode;
}

function mixElseIfReturnOrThrowExisted(currentNode: Node, parentNode: Node) {
  if (
    parentNode === undefined ||
    currentNode.type !== NODE.IF_STATEMENT ||
    currentNode.consequent.body.findIndex(
      node =>
        node.type === NODE.RETURN_STATEMENT ||
        node.type === NODE.BREAK_STATEMENT ||
        node.type === NODE.CONTINUE_STATEMENT ||
        node.type === NODE.THROW_STATEMENT
    ) === -1
  ) {
    return currentNode;
  }
  const body = parentNode.body.body || parentNode.body;
  if (!Array.isArray(body)) {
    return currentNode;
  }
  const indexOfSlice = body.indexOf(currentNode);
  if (indexOfSlice === -1) {
    return currentNode;
  }
  const alternate = currentNode.alternate || {
    type: NODE.BLOCK_STATEMENT,
    skipCalls: true,
    body: [],
    loc: {
      start: currentNode.loc.end,
      end: currentNode.loc.end
    }
  };
  alternate.body = alternate.body.concat(body.splice(indexOfSlice + 1));
  return {
    ...currentNode,
    alternate
  };
}

const getBody = (currentNode: any) =>
  currentNode.body ||
  currentNode.declarations ||
  currentNode.properties ||
  [
    currentNode.block,
    currentNode.handler,
    currentNode.test,
    currentNode.finalizer,
    currentNode.alternate,
    currentNode.value,
    currentNode.init && currentNode.init.callee,
    currentNode.init,
    currentNode.object,
    currentNode.property,
    currentNode.left,
    currentNode.right,
    currentNode.argument,
    currentNode.expression && currentNode.expression.callee,
    currentNode.expression,
    currentNode.discriminant,
    currentNode.callee,
    ...(currentNode.elements || []),
    ...(currentNode.cases || []),
    ...(currentNode.expressions || []),
    ...(currentNode.arguments || []).filter(a => !NODE.isFunction(a)),
    ...(Array.isArray(currentNode.consequent)
      ? currentNode.consequent
      : [currentNode.consequent])
  ].filter(Boolean);

const getNextParent = (currentNode: Tree, parentNode: ?Tree) =>
  parentNode &&
  ((NODE.isFunction(parentNode) && currentNode === parentNode.body) ||
    (NODE.isScopeCreator(parentNode) && !NODE.isScopeCreator(currentNode)))
    ? parentNode
    : currentNode;

const getCurrentNode = compose(
  mixDeclarationsInideForBlock,
  mixBodyToArrowFunctionExpression,
  mixTryCatchInfo,
  mixBlockForStatements,
  mixExportInfo,
  mixBlockToLogicalOperator,
  mixElseIfReturnOrThrowExisted,
  mixBlockToConditionalExpression,
  mixBlockToCaseStatement,
  mixParentToClassObjectAndFunction,
  sortClassMembers
);

export type Handler = (
  Tree,
  Tree,
  Handler,
  Handler,
  Handler,
  TraverseMeta
) => void | boolean;

function traverseTree(
  node: Tree,
  pre: Handler,
  middle: Handler,
  post: Handler,
  parentNode: ?Tree = null,
  meta?: TraverseMeta = {}
) {
  const currentNode = getCurrentNode(node, parentNode, meta);
  const shouldContinueTraversing = pre(
    currentNode,
    parentNode,
    pre,
    middle,
    post,
    meta
  );
  if (!shouldContinueTraversing) {
    return;
  }
  const body = getBody(currentNode);
  if (!body) {
    return;
  }
  const nextParent = getNextParent(currentNode, parentNode);
  if (Array.isArray(body)) {
    let i = 0;
    try {
      for (i = 0; i < body.length; i++) {
        middle(body[i], nextParent, pre, middle, post, meta);
      }
      for (i = 0; i < body.length; i++) {
        traverseTree(body[i], pre, middle, post, nextParent, {
          ...meta,
          kind: currentNode.kind
        });
      }
    } catch (e) {
      if (!(e instanceof UnreachableError)) {
        throw e;
      }
      if (i < body.length - 1) {
        throw new HegelError("Unreachable code after this line", e.loc);
      }
    }
  } else {
    traverseTree(body, pre, middle, post, nextParent, meta);
  }
  post(currentNode, parentNode, pre, middle, post, meta);
}

export default traverseTree;
