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
import { getPropertyChaining } from "../utils/inference-utils";
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

function isReturnTypeOfTypeof(node: Node) {
  return node.type === NODE.STRING_LITERAL;
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
  if (isReturnTypeOfTypeof(left)) {
    stringNode = left;
  } else if (isReturnTypeOfTypeof(right)) {
    stringNode = right;
  }
  if (!typeofNode || !stringNode) {
    return null;
  }
  return { typeofNode, stringNode };
}

function getRefinmentType(stringNode: Node): Type {
  switch (stringNode.value) {
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
    case "symbol":
      return Type.Symbol;  
    case "function":
      return FunctionType.Function;
    case "object":
      return UnionType.term("{ ... } | null", {}, [
        ObjectType.term("{ ... }", { isSoft: true }, []),
        Type.Null
      ]);
  }
  throw new HegelError(
    `Typeof cannot return "${stringNode.value}" value`,
    stringNode.loc
  );
}

function refinementVariants(
  [refinementedVariants, alternateVariants]: [Array<Type>, Array<Type>],
  variant: Type,
  refinementType: Type
): [Array<Type>, Array<Type>] {
  if (refinementType.isPrincipalTypeFor(variant)) {
    return [refinementedVariants.concat([variant]), alternateVariants];
  }
  if (variant.isPrincipalTypeFor(refinementType)) {
    return [
      refinementedVariants.concat([refinementType]),
      alternateVariants.concat([variant])
    ];
  }
  return [refinementedVariants, alternateVariants.concat([variant])];
}

function typeofIdentifier(
  node: Identifier,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  stringNode: Node,
  refinementNode: Node
): [string, Type, Type] {
  const variableName = node.name;
  const refinementType = getRefinmentType(stringNode);
  const variableInfo = currentScope.findVariable(node);
  const [refinementedVariants, alternateVariants] =
    variableInfo.type instanceof UnionType
      ? variableInfo.type.variants.reduce(
          (res, variant) => refinementVariants(res, variant, refinementType),
          [[], []]
        )
      : refinementVariants([[], []], variableInfo.type, refinementType);
  if (
    !(variableInfo.type instanceof TypeVar) &&
    variableInfo.type !== Type.Unknown &&
    refinementedVariants.length === 0
  ) {
    throw new HegelError(
      `Type ${String(variableInfo.type.name)} can't be "${
        stringNode.value
      }" type`,
      refinementNode.loc
    );
  }
  const refinementedType = UnionType.term(null, {}, refinementedVariants);
  const alternateType =
    alternateVariants.length === 0 || refinementType === variableInfo.type
      ? Type.Never
      : UnionType.term(null, {}, alternateVariants);
  if (refinementedType === Type.Never || alternateType === Type.Never) {
    throw new HegelError(
      `Variable ${
        refinementedType === Type.Never ? "can't be" : "is always"
      } "${stringNode.value}"`,
      refinementNode.loc
    );
  }
  return [variableName, refinementedType, alternateType];
}

function typeofProperty(
  node: MemberExpression,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  stringNode: Node,
  refinementNode: Node
): ?[string, Type, Type] {
  const targetObject = getMemberExressionTarget(node);
  if (targetObject.type !== NODE.IDENTIFIER) {
    return;
  }
  const variableName = targetObject.name;
  const propertiesChaining = getPropertyChaining(node);
  const refinementType = getRefinmentType(stringNode);
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
  if (!refinmentedAndAlternate) {
    return;
  }
  if (!refinmentedAndAlternate[0] || !refinmentedAndAlternate[1]) {
    throw new HegelError(
      `Property ${
        refinmentedAndAlternate[0] === undefined ? "can't be" : "is always"
      } "${stringNode.value}"`,
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
  let refinementedType, alternateType, name;
  if (typeofNode.argument.type === NODE.IDENTIFIER) {
    [name, refinementedType, alternateType] = typeofIdentifier(
      typeofNode.argument,
      currentScope,
      typeScope,
      stringNode,
      currentRefinementNode
    );
  }
  if (typeofNode.argument.type === NODE.MEMBER_EXPRESSION) {
    const result = typeofProperty(
      typeofNode.argument,
      currentScope,
      typeScope,
      stringNode,
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
