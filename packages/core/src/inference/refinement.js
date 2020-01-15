// @flow
import NODE from "../utils/nodes";
import { Type } from "../type-graph/types/type";
import { TypeScope } from "../type-graph/type-scope";
import { UnionType } from "../type-graph/types/union-type";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import { VariableScope } from "../type-graph/variable-scope";
import { inRefinement } from "./in-operator";
import { typeofRefinement } from "./typeof";
import { variableRefinement } from "./variable-refinement";
import { intersection, union } from "../utils/common";
import { instanceofRefinement } from "./instanceof";
import type { Node, BinaryExpression, LogicalExpression } from "@babel/parser";

function getScopesForLogicalExpression(
  condition: LogicalExpression,
  currentScope: VariableScope | ModuleScope,
  moduleScope: ModuleScope
): [VariableScope, VariableScope] {
  const primaryScopeName = VariableScope.getName({
    loc: { start: condition.loc.end }
  });
  // $FlowIssue
  let primaryScope: VariableScope = moduleScope.body.get(primaryScopeName);
  if (!(primaryScope instanceof VariableScope)) {
    primaryScope = new VariableScope(VariableScope.BLOCK_TYPE, currentScope);
    moduleScope.body.set(primaryScopeName, primaryScope);
  }
  const alternateScopeName = VariableScope.getName({
    loc: { start: condition.loc.start }
  });
  // $FlowIssue
  let alternateScope: VariableScope = moduleScope.body.get(alternateScopeName);
  if (!(alternateScope instanceof VariableScope)) {
    alternateScope = new VariableScope(VariableScope.BLOCK_TYPE, currentScope);
    moduleScope.body.set(alternateScopeName, alternateScope);
  }
  return condition.operator === "&&"
    ? [primaryScope, alternateScope]
    : [alternateScope, primaryScope];
}

function getPrimaryAndAlternativeScopes(
  currentRefinementNode: Node,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  moduleScope: ModuleScope
): [VariableScope, VariableScope | void] {
  let primaryScope: Node | void;
  let alternateScope: Node | void;
  switch (currentRefinementNode.type) {
    case NODE.IF_STATEMENT:
      primaryScope = moduleScope.body.get(
        VariableScope.getName(currentRefinementNode.consequent)
      );
      alternateScope =
        currentRefinementNode.alternate &&
        moduleScope.body.get(
          VariableScope.getName(currentRefinementNode.alternate)
        );
      break;
    case NODE.WHILE_STATEMENT:
    case NODE.DO_WHILE_STATEMENT:
    case NODE.FOR_STATEMENT:
      primaryScope = moduleScope.body.get(
        VariableScope.getName(currentRefinementNode.body)
      );
      break;
    case NODE.LOGICAL_EXPRESSION:
      [primaryScope, alternateScope] = getScopesForLogicalExpression(
        currentRefinementNode,
        currentScope,
        moduleScope
      );
  }
  if (
    !primaryScope ||
    primaryScope instanceof VariableInfo ||
    alternateScope instanceof VariableInfo
  ) {
    throw new Error("Never!");
  }
  return [primaryScope, alternateScope];
}

function getCondition(currentRefinementNode: Node) {
  switch (currentRefinementNode.type) {
    case NODE.IF_STATEMENT:
    case NODE.WHILE_STATEMENT:
    case NODE.DO_WHILE_STATEMENT:
    case NODE.FOR_STATEMENT:
      return currentRefinementNode.test;
    case NODE.LOGICAL_EXPRESSION:
      return currentRefinementNode;
  }
}

function intersectionOfTypes(
  type1: Type,
  type2: Type,
  typeScope: TypeScope
): Type {
  if (type1 instanceof UnionType && type2 instanceof UnionType) {
    const intersectedVariants = intersection(
      type1.variants,
      type2.variants,
      (a, b) => a.equalsTo(b)
    )[0];
    return UnionType.term(
      UnionType.getName(intersectedVariants),
      {},
      intersectedVariants
    );
  }
  if (type1 instanceof UnionType || type2 instanceof UnionType) {
    // $FlowIssue
    const [unionType, notUnion]: [UnionType, Type] =
      type1 instanceof UnionType ? [type1, type2] : [type2, type1];
    // $FlowIssue
    const isTypeExisting = unionType.variants.some(t => t.equalsTo(notUnion));
    return isTypeExisting ? notUnion : Type.Never;
  }
  return Type.Never;
}

function unionOfTypes(type1: Type, type2: Type, typeScope: TypeScope): Type {
  if (type1 instanceof UnionType && type2 instanceof UnionType) {
    const unionVariants = union(type1.variants, type2.variants, (a, b) =>
      a.equalsTo(b)
    );
    return UnionType.term(UnionType.getName(unionVariants), {}, unionVariants);
  }
  if (type1 instanceof UnionType || type2 instanceof UnionType) {
    const [unionType, notUnion]: [Type, Type] =
      type1 instanceof UnionType ? [type1, type2] : [type2, type1];
    const newVariants: Array<Type> = union(
      // $FlowIssue
      unionType.variants,
      [notUnion],
      (a, b) => a.equalsTo(b)
    );
    return UnionType.term(UnionType.getName(newVariants), {}, newVariants);
  }
  if (type1.isPrincipalTypeFor(type2)) {
    return type1;
  }
  if (type2.isPrincipalTypeFor(type1)) {
    return type2;
  }
  const variants = [type1, type2];
  return UnionType.term(UnionType.getName(variants), {}, variants);
}

function getRefinementByBinaryExpression(
  binaryExpression: BinaryExpression,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  moduleScope: ModuleScope
): ?[string, Type, Type] {
  switch (binaryExpression.operator) {
    case "==":
    case "!=":
    case "===":
    case "!==":
      return typeofRefinement(
        binaryExpression,
        currentScope,
        typeScope,
        moduleScope
      );
    case "in":
      return inRefinement(
        binaryExpression,
        currentScope,
        typeScope,
        moduleScope
      );
    case "instanceof":
      return instanceofRefinement(
        binaryExpression,
        currentScope,
        typeScope,
        moduleScope
      );
  }
}

function refinementByCondition(
  condition: Node,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  moduleScope: ModuleScope
): ?Array<[string, Type, Type]> {
  switch (condition.type) {
    case NODE.UNARY_EXPRESSION:
      if (condition.operator === "!") {
        const refinements = refinementByCondition(
          condition.argument,
          currentScope,
          typeScope,
          moduleScope
        );
        return (
          refinements &&
          refinements.map(
            refinement =>
              refinement && [refinement[0], refinement[2], refinement[1]]
          )
        );
      }
    case NODE.BINARY_EXPRESSION:
      const typeofResult = getRefinementByBinaryExpression(
        condition,
        currentScope,
        typeScope,
        moduleScope
      );
      return typeofResult && [typeofResult];
    case NODE.IDENTIFIER:
      const refinemented = variableRefinement(
        condition,
        currentScope,
        typeScope,
        moduleScope
      );
      return refinemented && [refinemented];
    case NODE.LOGICAL_EXPRESSION:
      const leftSideRefinement = refinementByCondition(
        condition.left.body || condition.left,
        currentScope,
        typeScope,
        moduleScope
      );
      const rightSideRefinement = refinementByCondition(
        condition.right.body || condition.right,
        currentScope,
        typeScope,
        moduleScope
      );
      if (!leftSideRefinement || !rightSideRefinement) {
        return leftSideRefinement || rightSideRefinement;
      }
      const [sameRefinement, other] = intersection(
        leftSideRefinement,
        rightSideRefinement,
        (a, b) => a[0] === b[0]
      );
      if (sameRefinement.length === 0) {
        return other;
      }
      const [
        additionalPrimaryScope,
        additionalAlternateScope
      ] = getScopesForLogicalExpression(condition, currentScope, moduleScope);
      const sameRefinementVariants = sameRefinement.map(
        ([key, refinementedType, alternateType]) => {
          const sameRefinement: any = leftSideRefinement.find(
            a => a[0] === key
          );
          if (condition.operator === "||") {
            additionalPrimaryScope.body.set(
              key,
              new VariableInfo(alternateType, additionalPrimaryScope)
            );
            return [
              key,
              unionOfTypes(refinementedType, sameRefinement[1], typeScope),
              intersectionOfTypes(alternateType, sameRefinement[2], typeScope)
            ];
          }
          if (condition.operator === "&&") {
            additionalPrimaryScope.body.set(
              key,
              new VariableInfo(refinementedType, additionalPrimaryScope)
            );
            return [
              key,
              intersectionOfTypes(
                refinementedType,
                sameRefinement[1],
                typeScope
              ),
              unionOfTypes(alternateType, sameRefinement[2], typeScope)
            ];
          }
          return [key, refinementedType, alternateType];
        }
      );
      return sameRefinementVariants.concat(other);
  }
}

export function refinement(
  currentRefinementNode: Node,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  moduleScope: ModuleScope
) {
  if (currentRefinementNode.isRefinemented) {
    return;
  }
  const [primaryScope, alternateScope] = getPrimaryAndAlternativeScopes(
    currentRefinementNode,
    currentScope,
    typeScope,
    moduleScope
  );
  const condition: ?Node = getCondition(currentRefinementNode);
  if (condition == undefined) {
    return;
  }
  const currentRefinements = refinementByCondition(
    condition,
    currentScope,
    typeScope,
    moduleScope
  );
  if (!currentRefinements) {
    return;
  }
  currentRefinements.forEach(refinement => {
    const [varName, refinementedType, alternateType] = refinement;
    primaryScope.body.set(varName, new VariableInfo(refinementedType));
    if (alternateType && alternateScope) {
      alternateScope.body.set(varName, new VariableInfo(alternateType));
    }
  });
}
