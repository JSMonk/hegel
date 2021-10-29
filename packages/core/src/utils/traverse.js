// @flow
import NODE from "./nodes";
import { ensureArray } from "../utils/common";
import HegelError, { UnreachableError } from "./errors";
import type { Node, Declaration, Block, SourceLocation } from "@babel/parser";

type Tree =
  | Node
  | {
      body: Array<Node> | Node,
      kind?: ?string,
      loc: SourceLocation,
    };

export type TraverseMeta = {
  kind?: ?string,
  previousBodyState?: Array<Node>,
  errors: Array<HegelError>,
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
        loc: currentNode.body.loc,
      },
    ],
    loc: currentNode.body.loc,
  };
  return currentNode;
}

function sortClassMembers(currentNode: Node) {
  if (
    currentNode.type !== NODE.CLASS_DECLARATION &&
    currentNode.type !== NODE.CLASS_EXPRESSION
  ) {
    return currentNode;
  }
  currentNode.body.body.sort((a, b) => (a.kind === "constructor" ? -1 : 1));
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
      end: currentNode.loc.start,
    },
  };
  currentNode.right = {
    type: NODE.BLOCK_STATEMENT,
    body: currentNode.right,
    loc: {
      start: currentNode.loc.end,
      end: currentNode.loc.end,
    },
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
      end: currentNode.loc.start,
    },
  };
  currentNode.alternate = {
    type: NODE.BLOCK_STATEMENT,
    body: currentNode.alternate,
    loc: {
      start: currentNode.loc.end,
      end: currentNode.loc.end,
    },
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
      loc: currentNode.alternate.loc,
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
    loc: currentNode[propertyName].loc,
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
      body,
    };
  }
  return currentNode;
}

function mixDeclarationsInideForBlock(currentNode: Node, parentNode: Node) {
  if (
    (currentNode.type !== NODE.FOR_IN_STATEMENT &&
      currentNode.type !== NODE.FOR_OF_STATEMENT &&
      (currentNode.type !== NODE.FOR_STATEMENT || currentNode.init === null)) ||
    parentNode.isCustom
  ) {
    return currentNode;
  }
  let init;
  if (currentNode.init != undefined) {
    init = currentNode.init;
  } else {
    init = {
      ...currentNode.left,
      declarations: [
        {
          ...currentNode.left.declarations[0],
          init: getInitFor(currentNode),
        },
      ],
    };
    currentNode.left = undefined;
  }
  return {
    type: NODE.BLOCK_STATEMENT,
    body: [init, currentNode],
    isCustom: true,
    loc: init.loc,
  };
}

function mixExportInfo(currentNode: Node) {
  if (
    currentNode.type !== NODE.EXPORT_NAMED_DECLARATION &&
    currentNode.type !== NODE.EXPORT_DEFAULT_DECLARATION
  ) {
    return currentNode;
  }
  if (currentNode.declaration == null) {
    return {
      type: NODE.EXPORT_LIST,
      exportKind: currentNode.exportKind,
      specifiers: currentNode.specifiers,
    };
  }
  return currentNode.declaration.type !== NODE.VARIABLE_DECLARATION
    ? {
        ...currentNode.declaration,
        exportAs:
          currentNode.type === NODE.EXPORT_DEFAULT_DECLARATION
            ? "default"
            : currentNode.declaration.id.name,
      }
    : {
        ...currentNode.declaration,
        declarations: currentNode.declaration.declarations.map(
          (declaration) => ({
            ...declaration,
            exportAs: declaration.id.name,
          })
        ),
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
      catchBlock: currentNode.handler,
    },
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
      currentNode.type === NODE.FUNCTION_DECLARATION)
  ) {
    currentNode.parentNode = parentNode;
  }
  return currentNode;
}

function copyLocOfNode(node) {
  return { start: { ...node.loc.start }, end: { ...node.loc.end } };
}

function convertObjectSpreadIntoAssign(currentNode: Node) {
  if (
    currentNode.type !== NODE.OBJECT_EXPRESSION ||
    !currentNode.properties.some((p) => p.type === NODE.SPREAD_ELEMENT)
  ) {
    return currentNode;
  }
  const properties = currentNode.properties;
  let lastObject;
  let lastProperty;
  const objects = [];
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    if (property.type === NODE.SPREAD_ELEMENT) {
      if (lastObject !== undefined) {
        lastObject.loc.end = lastProperty.loc.end;
      }
      objects.push(property.argument);
      lastObject = undefined;
    } else {
      if (lastObject === undefined) {
        lastObject = {
          ...currentNode,
          loc:
            lastProperty === undefined
              ? copyLocOfNode(currentNode)
              : { start: lastProperty.loc.end },
          properties: [property],
        };
        objects.push(lastObject);
      } else {
        lastObject.properties.push(property);
      }
      lastProperty = property;
    }
  }
  if (lastObject !== undefined && lastObject.properties.length !== 0) {
    lastObject.loc.end = lastProperty.loc.end;
  }
  if (objects.length === 1) {
    objects.unshift({
      type: NODE.OBJECT_EXPRESSION,
      properties: [],
      loc: copyLocOfNode(currentNode),
    });
  }
  Object.assign(currentNode, {
    type: NODE.CALL_EXPRESSION,
    loc: currentNode.loc,
    arguments: objects,
    callee: {
      type: NODE.MEMBER_EXPRESSION,
      loc: currentNode.loc,
      object: { type: NODE.IDENTIFIER, loc: currentNode.loc, name: "Object" },
      property: { type: NODE.IDENTIFIER, loc: currentNode.loc, name: "assign" },
    },
    properties: undefined,
  });
  return currentNode;
}

function convertArraySpreadIntoConcat(currentNode: Node) {
  if (
    currentNode.type !== NODE.ARRAY_EXPRESSION ||
    !currentNode.elements.some((p) => p.type === NODE.SPREAD_ELEMENT)
  ) {
    return currentNode;
  }
  const elements = currentNode.elements;
  const arrays = [];
  let lastArray;
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (element.type === NODE.SPREAD_ELEMENT) {
      arrays.push({
        type: NODE.CALL_EXPRESSION,
        loc: currentNode.loc,
        arguments: [element.argument],
        callee: {
          type: NODE.MEMBER_EXPRESSION,
          loc: currentNode.loc,
          object: {
            type: NODE.IDENTIFIER,
            loc: currentNode.loc,
            name: "Array",
          },
          property: {
            type: NODE.IDENTIFIER,
            loc: currentNode.loc,
            name: "from",
          },
        },
        elements: undefined,
      });
      lastArray = undefined;
    } else {
      if (lastArray === undefined) {
        lastArray = {
          ...currentNode,
          elements: [element],
          loc: currentNode.loc,
        };
        arrays.push(lastArray);
      } else {
        lastArray.elements.push(element);
      }
    }
  }
  const callee =
    arrays.length === 1
      ? {
          type: NODE.MEMBER_EXPRESSION,
          loc: currentNode.loc,
          object: {
            type: NODE.IDENTIFIER,
            loc: currentNode.loc,
            name: "Array",
          },
          property: {
            type: NODE.IDENTIFIER,
            loc: currentNode.loc,
            name: "from",
          },
        }
      : {
          type: NODE.MEMBER_EXPRESSION,
          loc: currentNode.loc,
          object: arrays.shift(),
          property: {
            type: NODE.IDENTIFIER,
            loc: currentNode.loc,
            name: "concat",
          },
        };
  Object.assign(currentNode, {
    type: NODE.CALL_EXPRESSION,
    loc: currentNode.loc,
    arguments: arrays,
    callee,
    elements: undefined,
  });
  return currentNode;
}

function getNameForPattern(pattern: Node) {
  let left = "{";
  let right = "}";
  if (pattern.type === NODE.ARRAY_PATTERN) {
    left = "[";
    right = "]";
  }
  return `${left}${pattern.loc.start.line}:${pattern.loc.start.column}${right}`;
}

function patternElementIntoDeclarator(
  currentNode: Node,
  init: Node,
  index: number,
  properties?: Array<Node>
) {
  if (currentNode === null) {
    return null;
  }
  switch (currentNode.type) {
    case NODE.ASSIGNMENT_PATTERN:
      const identifier = patternElementIntoDeclarator(
        currentNode.left,
        init,
        index,
        properties
      );
      identifier.init = {
        type: NODE.LOGICAL_EXPRESSION,
        operator: "??",
        left: identifier.init,
        right: currentNode.right,
      };
      return identifier;
    case NODE.OBJECT_PROPERTY:
      properties.push(
        currentNode.key.type === NODE.IDENTIFIER
          ? { type: NODE.STRING_LITERAL, value: currentNode.key.name }
          : currentNode.key
      );
      currentNode.isPattern = true;
      return {
        type: NODE.VARIABLE_DECLARATOR,
        id: currentNode.value,
        loc: currentNode.loc,
        init: {
          computed: currentNode.key.type !== NODE.IDENTIFIER,
          type: NODE.MEMBER_EXPRESSION,
          object: init,
          loc: currentNode.loc,
          property: currentNode.key,
        },
      };
    case NODE.OBJECT_PATTERN:
    case NODE.IDENTIFIER:
    case NODE.ARRAY_PATTERN:
      return {
        type: NODE.VARIABLE_DECLARATOR,
        id: currentNode,
        loc: currentNode.loc,
        init: {
          type: NODE.MEMBER_EXPRESSION,
          computed: true,
          object: init,
          loc: currentNode.loc,
          property: {
            type: NODE.NUMERIC_LITERAL,
            value: index,
            loc: currentNode.loc,
          },
        },
      };
    case NODE.REST_ELEMENT:
      return properties === undefined
        ? {
            type: NODE.VARIABLE_DECLARATOR,
            id: currentNode.argument,
            loc: currentNode.loc,
            init: {
              type: NODE.CALL_EXPRESSION,
              loc: currentNode.loc,
              arguments: [{ type: NODE.NUMERIC_LITERAL, value: index }],
              callee: {
                type: NODE.MEMBER_EXPRESSION,
                loc: currentNode.loc,
                object: init,
                property: {
                  type: NODE.IDENTIFIER,
                  loc: currentNode.loc,
                  name: "slice",
                },
              },
            },
          }
        : {
            type: NODE.VARIABLE_DECLARATOR,
            id: currentNode.argument,
            loc: currentNode.loc,
            init: {
              type: NODE.CALL_EXPRESSION,
              loc: currentNode.loc,
              arguments: [
                init,
                {
                  type: NODE.ARRAY_EXPRESSION,
                  elements: properties,
                },
              ],
              callee: {
                type: NODE.IDENTIFIER,
                loc: currentNode.loc,
                name: "Object::Omit",
              },
            },
          };
  }
}

function patternDeclarationIntoAssignments(currentNode: Node) {
  const pattern = currentNode.id;
  const identifier = {
    type: NODE.IDENTIFIER,
    loc: currentNode.id.loc,
    name: getNameForPattern(pattern),
  };
  currentNode.id = identifier;
  const isObjectPattern = pattern.type === NODE.OBJECT_PATTERN;
  const properties = isObjectPattern ? [] : undefined;
  const elements = isObjectPattern ? pattern.properties : pattern.elements;
  return [
    currentNode,
    ...elements
      .map((node, index) =>
        patternElementIntoDeclarator(node, identifier, index, properties)
      )
      .filter((n) => n !== null),
  ];
}

function convertPatternIntoAssignments(currentNode: Node) {
  if (
    currentNode.type !== NODE.VARIABLE_DECLARATION ||
    !currentNode.declarations.some((declaration) => {
      declaration = declaration.id.left || declaration.id;
      return (
        declaration.type === NODE.ARRAY_PATTERN ||
        declaration.type === NODE.OBJECT_PATTERN
      );
    })
  ) {
    return currentNode;
  }
  currentNode.declarations = currentNode.declarations.flatMap((decl) =>
    decl.id.type === NODE.IDENTIFIER
      ? [decl]
      : patternDeclarationIntoAssignments(decl)
  );
  return convertPatternIntoAssignments(currentNode);
}

function convertPatternFunctionParamsIntoAssign(currentNode: Node) {
  if (
    !NODE.isFunction(currentNode) ||
    !currentNode.params.some((param) => {
      param = param.left || param;
      return (
        param.type === NODE.ARRAY_PATTERN || param.type === NODE.OBJECT_PATTERN
      );
    })
  ) {
    return currentNode;
  }
  const declarations = [];
  currentNode.params = currentNode.params.map((param, index) => {
    const isAssignmentPattern = param.type === NODE.ASSIGNMENT_PATTERN;
    const arg = isAssignmentPattern ? param.left : param;
    if (arg.type !== NODE.ARRAY_PATTERN && arg.type !== NODE.OBJECT_PATTERN) {
      return param;
    }
    const newArg = {
      ...arg,
      type: NODE.IDENTIFIER,
      name: `arg:${index}`,
      loc: arg.loc,
    };
    declarations.push({
      type: NODE.VARIABLE_DECLARATOR,
      id: arg,
      init: newArg,
      loc: arg.loc,
    });
    return isAssignmentPattern ? { ...param, left: newArg } : newArg;
  });
  currentNode.body.body.unshift({
    type: NODE.VARIABLE_DECLARATION,
    kind: "let",
    declarations,
  });
  return currentNode;
}

function removeNodesWhichConteindInElse(
  alternateBody: Array<Node>,
  inferencedBody: Array<Node>
) {
  for (let i = 0; i < inferencedBody.length; i++) {
    if (alternateBody.includes(inferencedBody[i])) {
      inferencedBody[i] = undefined;
    }
  }
}

function mixElseIfReturnOrThrowExisted(
  currentNode: Node,
  parentNode: Node,
  { previousBodyState = [] }: TraverseMeta
) {
  if (
    parentNode === undefined ||
    currentNode.type !== NODE.IF_STATEMENT ||
    currentNode.consequent.body.findIndex(
      (node) =>
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
      end: currentNode.loc.end,
    },
  };
  const inferencedAlternate = body.splice(indexOfSlice + 1);
  alternate.body = alternate.body.concat(inferencedAlternate);
  removeNodesWhichConteindInElse(inferencedAlternate, previousBodyState);
  return {
    ...currentNode,
    alternate,
  };
}

const getBody = (currentNode: any) =>
  [
    ...ensureArray(currentNode.body),
    ...ensureArray(currentNode.declarations),
    ...ensureArray(currentNode.properties),
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
    currentNode.callee,
    ...ensureArray(currentNode.elements),
    ...ensureArray(currentNode.cases),
    ...ensureArray(currentNode.expressions),
    ...ensureArray(currentNode.arguments).filter((a) => !NODE.isFunction(a)),
    ...ensureArray(currentNode.consequent),
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
  sortClassMembers,
  convertObjectSpreadIntoAssign,
  convertArraySpreadIntoConcat,
  convertPatternIntoAssignments,
  convertPatternFunctionParamsIntoAssign
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
  meta: TraverseMeta
) {
  try {
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
    const nextParent = getNextParent(currentNode, parentNode);
    let i = 0;
    const newMeta = {
      ...meta,
      previousBodyState: body,
      kind: currentNode.kind,
    };
    try {
      for (i = 0; i < body.length; i++) {
        const node = body[i];
        if (node !== undefined) {
          middle(node, nextParent, pre, middle, post, newMeta);
        }
      }
      for (i = 0; i < body.length; i++) {
        const node = body[i];
        if (node !== undefined) {
          traverseTree(node, pre, middle, post, nextParent, newMeta);
        }
      }
    } catch (e) {
      if (!(e instanceof UnreachableError)) {
        throw e;
      }
      if (i < body.length - 1) {
        meta.errors.push(
          new HegelError("Unreachable code after this line", e.loc)
        );
        return;
      }
    }
    post(currentNode, parentNode, pre, middle, post, newMeta);
  } catch (e) {
    if (e instanceof Error && !(e instanceof HegelError)) {
      throw e;
    }
    if (Array.isArray(e)) {
      meta.errors.push(...e);
    } else {
      meta.errors.push(e);
    }
  }
}

export default traverseTree;
