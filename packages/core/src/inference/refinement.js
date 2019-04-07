// @flow
import NODE from "../utils/nodes";
import { Type } from "../type-graph/types/type";
import { Scope } from "../type-graph/scope";
import { UnionType } from "../type-graph/types/union-type";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import { inRefinement } from "./in-operator";
import { typeofRefinement } from "./typeof";
import { intersection, union } from "../utils/common";
import { instanceofRefinement } from "./instanceof";
import type { Node, BinaryExpression } from "@babel/parser";

function getPrimaryAndAlternativeScopes(
  currentRefinementNode: Node,
  currentScope: Scope | ModuleScope,
  typeScope: Scope,
  moduleScope: ModuleScope
): [Scope, ?Scope] {
  let primaryScope: ?Node = null;
  let alternateScope: ?Node = null;
  switch (currentRefinementNode.type) {
    case NODE.IF_STATEMENT:
      primaryScope = moduleScope.body.get(
        Scope.getName(currentRefinementNode.consequent)
      );
      alternateScope =
        currentRefinementNode.alternate &&
        moduleScope.body.get(Scope.getName(currentRefinementNode.alternate));
      break;
    case NODE.WHILE_STATEMENT:
    case NODE.DO_WHILE_STATEMENT:
    case NODE.FOR_STATEMENT:
      primaryScope = moduleScope.body.get(
        Scope.getName(currentRefinementNode.body)
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

function intersectionOfTypes(type1: Type, type2: Type, typeScope: Scope): Type {
  if (type1 instanceof UnionType && type2 instanceof UnionType) {
    const intersectedVariants = intersection(
      type1.variants,
      type2.variants,
      (a, b) => a.equalsTo(b)
    )[0];
    return UnionType.createTypeWithName(
      UnionType.getName(intersectedVariants),
      typeScope,
      intersectedVariants
    );
  }
  if (type1 instanceof UnionType || type2 instanceof UnionType) {
    // $FlowIssue
    const [unionType, notUnion]: [UnionType, Type] =
      type1 instanceof UnionType ? [type1, type2] : [type2, type1];
    // $FlowIssue
    const isTypeExisting = unionType.variants.some(t => t.equalsTo(notUnion));
    return isTypeExisting
      ? notUnion
      : Type.createTypeWithName("never", typeScope);
  }
  return Type.createTypeWithName("never", typeScope);
}

function unionOfTypes(type1: Type, type2: Type, typeScope): Type {
  if (type1 instanceof UnionType && type2 instanceof UnionType) {
    const unionVariants = union(type1.variants, type2.variants, (a, b) =>
      a.equalsTo(b)
    );
    return UnionType.createTypeWithName(
      UnionType.getName(unionVariants),
      typeScope,
      unionVariants
    );
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
    return UnionType.createTypeWithName(
      UnionType.getName(newVariants),
      typeScope,
      newVariants
    );
  }
  if (type1.isPrincipalTypeFor(type2)) {
    return type1;
  }
  if (type2.isPrincipalTypeFor(type1)) {
    return type2;
  }
  const variants = [type1, type2];
  return UnionType.createTypeWithName(
    UnionType.getName(variants),
    typeScope,
    variants
  );
}

function getRefinementByBinaryExpression(
  binaryExpression: BinaryExpression,
  currentScope: Scope | ModuleScope,
  typeScope: Scope,
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
  currentScope: Scope | ModuleScope,
  typeScope: Scope,
  moduleScope: ModuleScope
): ?Array<[string, Type, Type]> {
  switch (condition.type) {
    case NODE.BINARY_EXPRESSION:
      const typeofResult = getRefinementByBinaryExpression(
        condition,
        currentScope,
        typeScope,
        moduleScope
      );
      return typeofResult && [typeofResult];
    case NODE.LOGICAL_EXPRESSION:
      const leftSideRefinement = refinementByCondition(
        condition.left,
        currentScope,
        typeScope,
        moduleScope
      );
      const rightSideRefinement = refinementByCondition(
        condition.right,
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
      const sameRefinementVariants = sameRefinement.map(
        ([key, refinementedType, alternateType]) => {
          const sameRefinement: any = leftSideRefinement.find(
            a => a[0] === key
          );
          if (condition.operator === "||") {
            return [
              key,
              unionOfTypes(refinementedType, sameRefinement[1], typeScope),
              intersectionOfTypes(alternateType, sameRefinement[2], typeScope)
            ];
          }
          if (condition.operator === "&&") {
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
  currentScope: Scope | ModuleScope,
  typeScope: Scope,
  moduleScope: ModuleScope
): void {
  const [primaryScope, alternateScope] = getPrimaryAndAlternativeScopes(
    currentRefinementNode,
    currentScope,
    typeScope,
    moduleScope
  );
  const condition: ?Node = currentRefinementNode.test;
  if (!condition) {
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
