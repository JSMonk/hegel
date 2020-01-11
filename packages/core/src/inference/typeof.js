// @flow
import NODE from "../utils/nodes";
import HegelError from "../utils/errors";
import { Type } from "../type-graph/types/type";
import { TypeVar } from "../type-graph/types/type-var";
import { TypeScope } from "../type-graph/type-scope";
import { UnionType } from "../type-graph/types/union-type";
import { ObjectType } from "../type-graph/types/object-type";
import { FunctionType } from "../type-graph/types/function-type";
import { VariableScope } from "../type-graph/variable-scope";
import { getMemberExressionTarget } from "../utils/common";
import { equalsRefinement, refinementProperty } from "./equals-refinement";
import {
  getPropertyChaining,
  getTypesFromVariants
} from "../utils/inference-utils";
import type { VariableInfo } from "../type-graph/variable-info";
import type { ModuleScope } from "../type-graph/module-scope";
import type {
  Node,
  Identifier,
  StringLiteral,
  NumberLiteral,
  BooleanLiteral,
  MemberExpression
} from "@babel/parser";

function isEqualOperator(node: Node) {
  return (
    node.type === NODE.BINARY_EXPRESSION &&
    (node.operator === "===" ||
      node.operator === "==" ||
      node.operator === "!==" ||
      node.operator === "!=")
  );
}

function isTypeofOperator(node: Node) {
  return node.type === NODE.UNARY_EXPRESSION && node.operator === "typeof";
}

function isReturnTypeOfTypeof(node: Node, typeofOperator: VariableInfo) {
  if (
    !(typeofOperator.type instanceof FunctionType) ||
    !(typeofOperator.type.returnType instanceof UnionType)
  ) {
    throw new Error("Never!");
  }
  const returnTypes = typeofOperator.type.returnType;
  return (
    node.type === NODE.STRING_LITERAL &&
    returnTypes.variants.some(type => type.name === `'${node.value}'`)
  );
}

function getTypeofAndLiteral(
  left: Node,
  right: Node,
  typeofOperator: VariableInfo
): ?{ typeofNode: Node, stringNode: Node } {
  let typeofNode: ?Node = null;
  if (isTypeofOperator(left)) {
    typeofNode = left;
  } else if (isTypeofOperator(right)) {
    typeofNode = right;
  }
  let stringNode: ?Node = null;
  if (isReturnTypeOfTypeof(left, typeofOperator)) {
    stringNode = left;
  } else if (isReturnTypeOfTypeof(right, typeofOperator)) {
    stringNode = right;
  }
  if (!typeofNode || !stringNode) {
    return null;
  }
  return { typeofNode, stringNode };
}

function getRefinmentType(typeName: string): Type {
  switch (typeName) {
    case "number":
      return Type.Number;
    case "string":
      return Type.String;
    case "boolean":
      return Type.Boolean;
    case "bigint":
      return Type.BigInt;
    case "undefined":
      return Type.Undefined;
    case "function":
      return FunctionType.Function;
    case "object":
      return UnionType.term("Object | null", {}, [
        ObjectType.Object,
        Type.Null
      ]);
  }
  throw new Error("Never!");
}

function typeofIdentifier(
  node: Identifier,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  stringLiteral: string,
  refinementNode: Node
): [string, Type, Type] {
  const variableName = node.name;
  const refinementType = getRefinmentType(stringLiteral);
  const variableInfo = currentScope.findVariable(node);
  const [refinementedVariants, alternateVariants] =
    variableInfo.type instanceof UnionType
      ? variableInfo.type.variants.reduce(
          ([refinementedVariants, alternateVariants], variant) =>
            refinementType.isPrincipalTypeFor(variant)
              ? [refinementedVariants.concat([variant]), alternateVariants]
              : [refinementedVariants, alternateVariants.concat([variant])],
          [[], []]
        )
      : [[], []];
  if (
    !(variableInfo.type instanceof TypeVar) &&
    refinementedVariants.length === 0
  ) {
    throw new HegelError(
      `Type ${String(variableInfo.type.name)} can't be "${stringLiteral}" type`,
      refinementNode.loc
    );
  }
  let refinementedType;
  let alternateType;
  if (variableInfo.type instanceof UnionType) {
    refinementedType = UnionType.term(null, {}, refinementedVariants);
    alternateType = UnionType.term(null, {}, alternateVariants);
  } else {
    refinementedType = refinementType;
    alternateType = variableInfo.type;
  }
  return [variableName, refinementedType, alternateType];
}

function typeofProperty(
  node: MemberExpression,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  stringLiteral: string,
  refinementNode: Node
): ?[string, Type, Type] {
  const targetObject = getMemberExressionTarget(node);
  if (targetObject.type !== NODE.IDENTIFIER) {
    return;
  }
  const variableName = targetObject.name;
  const propertiesChaining = getPropertyChaining(node);
  const refinementType = getRefinmentType(stringLiteral);
  const targetVariableInfo = currentScope.findVariable(targetObject);
  if (!variableName || !propertiesChaining) {
    return;
  }
  const refinmentedAndAlternate = refinementProperty(
    variableName,
    targetVariableInfo.type,
    refinementType,
    refinementNode,
    0,
    propertiesChaining,
    typeScope
  );
  if (
    !refinmentedAndAlternate ||
    !refinmentedAndAlternate[0] ||
    !refinmentedAndAlternate[1]
  ) {
    throw new HegelError(
      `Property can't be "${stringLiteral}" type or always have type "${stringLiteral}"`,
      refinementNode.loc
    );
  }
  return [variableName, refinmentedAndAlternate[0], refinmentedAndAlternate[1]];
}

export function typeofRefinement(
  currentRefinementNode: Node,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  moduleScope: ModuleScope
): ?[string, Type, Type] {
  const typeofOperator = moduleScope.findVariable({ name: "typeof" });
  if (!isEqualOperator(currentRefinementNode)) {
    return;
  }
  const args = getTypeofAndLiteral(
    currentRefinementNode.left,
    currentRefinementNode.right,
    typeofOperator
  );
  if (!args) {
    return equalsRefinement(
      currentRefinementNode,
      currentScope,
      typeScope,
      moduleScope
    );
  }
  const { typeofNode, stringNode } = args;
  const stringLiteral = stringNode.value;
  let refinementedType, alternateType, name;
  if (typeofNode.argument.type === NODE.IDENTIFIER) {
    [name, refinementedType, alternateType] = typeofIdentifier(
      typeofNode.argument,
      currentScope,
      typeScope,
      stringLiteral,
      currentRefinementNode
    );
  }
  if (typeofNode.argument.type === NODE.MEMBER_EXPRESSION) {
    const result = typeofProperty(
      typeofNode.argument,
      currentScope,
      typeScope,
      stringLiteral,
      currentRefinementNode
    );
    if (!result) {
      return;
    }
    [name, refinementedType, alternateType] = result;
  }
  if (refinementedType) {
    if (
      currentRefinementNode.operator === "!==" ||
      currentRefinementNode.operator === "!="
    ) {
      // $FlowIssue
      return [name, alternateType, refinementedType];
    }
    // $FlowIssue
    return [name, refinementedType, alternateType];
  }
}
