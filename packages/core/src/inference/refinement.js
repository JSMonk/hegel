// @flow
import NODE from "../utils/nodes";
import HegelError from "../utils/errors";
import { Type } from "../type-graph/types/type";
import { TypeScope } from "../type-graph/type-scope";
import { UnionType } from "../type-graph/types/union-type";
import { ModuleScope } from "../type-graph/module-scope";
import { VariableInfo } from "../type-graph/variable-info";
import { $Refinemented } from "../type-graph/types/refinemented-type";
import { VariableScope } from "../type-graph/variable-scope";
import { inRefinement } from "./in-operator";
import { equalsRefinement } from "./equals-refinement";
import { typeofRefinement } from "./typeof";
import { variableRefinement } from "./variable-refinement";
import { intersection, union } from "../utils/common";
import { instanceofRefinement } from "./instanceof";
import type {
  Node,
  BinaryExpression,
  LogicalExpression,
  ConditionalExpression,
} from "@babel/parser";

function getScopesForLogicalExpression(
  condition: LogicalExpression,
  currentScope: VariableScope | ModuleScope,
  moduleScope: ModuleScope
): [VariableScope, VariableScope] {
  const primaryScopeName = VariableScope.getName({
    loc: { start: condition.loc.end },
  });
  // $FlowIssue
  let primaryScope: VariableScope = moduleScope.scopes.get(primaryScopeName);
  if (!(primaryScope instanceof VariableScope)) {
    primaryScope = new VariableScope(VariableScope.BLOCK_TYPE, currentScope);
    moduleScope.scopes.set(primaryScopeName, primaryScope);
  }
  const alternateScopeName = VariableScope.getName({
    loc: { start: condition.loc.start },
  });
  // $FlowIssue
  let alternateScope: VariableScope = moduleScope.scopes.get(
    alternateScopeName
  );
  if (!(alternateScope instanceof VariableScope)) {
    alternateScope = new VariableScope(VariableScope.BLOCK_TYPE, currentScope);
    moduleScope.scopes.set(alternateScopeName, alternateScope);
  }
  return condition.operator === "&&"
    ? [primaryScope, alternateScope]
    : [alternateScope, primaryScope];
}

function getScopesForSwitchCase(
  condition: Node,
  currentScope: VariableScope | ModuleScope,
  moduleScope: ModuleScope
): [VariableScope, Array<VariableScope> | void] {
  const primaryScopeName = VariableScope.getName(condition.consequent);
  // $FlowIssue
  let primaryScope: VariableScope = moduleScope.scopes.get(primaryScopeName);
  if (!(primaryScope instanceof VariableScope)) {
    primaryScope = new VariableScope(
      VariableScope.BLOCK_TYPE,
      currentScope,
      undefined,
      condition.test === null ? "default-case" : "case"
    );
    moduleScope.scopes.set(primaryScopeName, primaryScope);
  }
  const currentCaseIndex = condition.parent.cases.indexOf(condition);
  if (currentCaseIndex === -1) {
    return [primaryScope, []];
  }
  const alternateScopes = [];
  for (let i = currentCaseIndex + 1; i < condition.parent.cases.length; i++) {
    const $case = condition.parent.cases[i];
    const alternateScopeName = VariableScope.getName($case.consequent);
    // $FlowIssue
    let alternateScope: VariableScope = moduleScope.scopes.get(
      alternateScopeName
    );
    if (!(alternateScope instanceof VariableScope)) {
      alternateScope = new VariableScope(
        VariableScope.BLOCK_TYPE,
        currentScope,
        undefined,
        $case.test === null ? "default-case" : "case"
      );
      moduleScope.scopes.set(alternateScopeName, alternateScope);
    }
    alternateScopes.push(alternateScope);
  }
  return [primaryScope, alternateScopes];
}

function getScopesForConditionalExpression(
  condition: ConditionalExpression,
  currentScope: VariableScope | ModuleScope,
  moduleScope: ModuleScope
): [VariableScope, VariableScope] {
  const primaryScopeName = VariableScope.getName({
    loc: { start: condition.loc.start },
  });
  // $FlowIssue
  let primaryScope: VariableScope = moduleScope.scopes.get(primaryScopeName);
  if (!(primaryScope instanceof VariableScope)) {
    primaryScope = new VariableScope(VariableScope.BLOCK_TYPE, currentScope);
    moduleScope.scopes.set(primaryScopeName, primaryScope);
  }
  const alternateScopeName = VariableScope.getName({
    loc: { start: condition.loc.end },
  });
  // $FlowIssue
  let alternateScope: VariableScope = moduleScope.scopes.get(
    alternateScopeName
  );
  if (!(alternateScope instanceof VariableScope)) {
    alternateScope = new VariableScope(VariableScope.BLOCK_TYPE, currentScope);
    moduleScope.scopes.set(alternateScopeName, alternateScope);
  }
  return [primaryScope, alternateScope];
}

function getPrimaryAndAlternativeScopes(
  currentRefinementNode: Node,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  moduleScope: ModuleScope
): [VariableScope, VariableScope | Array<VariableScope> | void] {
  let primaryScope: Node | void;
  let alternateScope: Node | void;
  switch (currentRefinementNode.type) {
    case NODE.IF_STATEMENT:
      primaryScope = moduleScope.scopes.get(
        VariableScope.getName(currentRefinementNode.consequent)
      );
      alternateScope =
        currentRefinementNode.alternate &&
        moduleScope.scopes.get(
          VariableScope.getName(currentRefinementNode.alternate)
        );
      break;
    case NODE.WHILE_STATEMENT:
    case NODE.DO_WHILE_STATEMENT:
    case NODE.FOR_STATEMENT:
      primaryScope = moduleScope.scopes.get(
        VariableScope.getName(currentRefinementNode.body)
      );
      break;
    case NODE.LOGICAL_EXPRESSION:
      [primaryScope, alternateScope] = getScopesForLogicalExpression(
        currentRefinementNode,
        currentScope,
        moduleScope
      );
      break;
    case NODE.CONDITIONAL_EXPRESSION:
      [primaryScope, alternateScope] = getScopesForConditionalExpression(
        currentRefinementNode,
        currentScope,
        moduleScope
      );
      break;
    case NODE.SWITCH_CASE:
      [primaryScope, alternateScope] = getScopesForSwitchCase(
        currentRefinementNode,
        currentScope,
        moduleScope
      );
      break;
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
    case NODE.CONDITIONAL_EXPRESSION:
    case NODE.WHILE_STATEMENT:
    case NODE.DO_WHILE_STATEMENT:
    case NODE.FOR_STATEMENT:
      return currentRefinementNode.test;
    case NODE.LOGICAL_EXPRESSION:
    case NODE.SWITCH_CASE:
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
    return UnionType.term(null, {}, intersectedVariants);
  }
  if (type1 instanceof UnionType || type2 instanceof UnionType) {
    // $FlowIssue
    const [unionType, notUnion]: [UnionType, Type] =
      // $FlowIssue
      type1 instanceof UnionType ? [type1, type2] : [type2, type1];
    const isTypeExisting = unionType.variants.some((t) => t.equalsTo(notUnion));
    return isTypeExisting ? notUnion : Type.Never;
  }
  return type1;
}

function unionOfTypes(type1: Type, type2: Type, typeScope: TypeScope): Type {
  if (type1 instanceof UnionType && type2 instanceof UnionType) {
    const unionVariants = union(type1.variants, type2.variants, (a, b) =>
      a.equalsTo(b)
    );
    return UnionType.term(null, {}, unionVariants);
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
    return UnionType.term(null, {}, newVariants);
  }
  if (type1.isPrincipalTypeFor(type2)) {
    return type1;
  }
  if (type2.isPrincipalTypeFor(type1)) {
    return type2;
  }
  const variants = [type1, type2];
  return UnionType.term(null, {}, variants);
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
  moduleScope: ModuleScope,
  primaryScope: VariableScope | ModuleScope
): ?Array<[string, Type, Type]> {
  switch (condition.type) {
    case NODE.SWITCH_CASE:
      const caseRefinement = equalsRefinement(
        condition,
        primaryScope,
        typeScope,
        moduleScope
      );
      const indexOfCurrentCase = condition.parent.cases.indexOf(condition);
      const previousCase =
        indexOfCurrentCase > 0
          ? condition.parent.cases[indexOfCurrentCase - 1]
          : undefined;
      if (
        caseRefinement &&
        previousCase &&
        !previousCase.consequent.body.some(
          (a) =>
            a.type === NODE.BREAK_STATEMENT ||
            a.type === NODE.THROW_STATEMENT ||
            a.type === NODE.RETURN_STATEMENT
        )
      ) {
        const [name, primary, alternate] = caseRefinement;
        const previousCaseScope = moduleScope.scopes.get(
          VariableScope.getName(previousCase.consequent)
        );
        if (previousCaseScope === undefined) {
          throw new Error("Never!!!");
        }
        const previousPrimaryRefinement = previousCaseScope.body.get(name);
        if (previousPrimaryRefinement === undefined) {
          return;
        }
        return [
          [
            name,
            UnionType.term(null, {}, [primary, previousPrimaryRefinement.type]),
            alternate,
          ],
        ];
      }
      return caseRefinement && [caseRefinement];
    case NODE.UNARY_EXPRESSION:
      if (condition.operator === "!") {
        const refinements = refinementByCondition(
          condition.argument,
          currentScope,
          typeScope,
          moduleScope,
          primaryScope
        );
        return (
          refinements &&
          refinements.map(
            (refinement) =>
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
    case NODE.MEMBER_EXPRESSION:
      const refinemented = variableRefinement(
        condition,
        currentScope,
        typeScope,
        moduleScope
      );
      return refinemented && [refinemented];
    case NODE.LOGICAL_EXPRESSION:
      const [
        additionalPrimaryScope,
        additionalAlternateScope,
      ] = getScopesForLogicalExpression(condition, currentScope, moduleScope);
      const leftSideRefinement = refinementByCondition(
        condition.left.body || condition.left,
        currentScope,
        typeScope,
        moduleScope,
        primaryScope
      );
      if (leftSideRefinement) {
        leftSideRefinement.forEach(([key, refinement, alternate]) => {
          if (
            refinement !== undefined &&
            !additionalPrimaryScope.body.has(key)
          ) {
            additionalPrimaryScope.body.set(
              key,
              new VariableInfo(refinement, additionalPrimaryScope)
            );
          }
          if (
            alternate !== undefined &&
            !additionalAlternateScope.body.has(key)
          ) {
            additionalAlternateScope.body.set(
              key,
              new VariableInfo(alternate, additionalAlternateScope)
            );
          }
        });
      }
      const rightSideRefinement = refinementByCondition(
        condition.right.body || condition.right,
        condition.operator === "||"
          ? additionalAlternateScope
          : additionalPrimaryScope,
        typeScope,
        moduleScope,
        primaryScope
      );
      if (!leftSideRefinement || !rightSideRefinement) {
        return condition.operator === "&&"
          ? leftSideRefinement
          : rightSideRefinement;
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
            (a) => a[0] === key
          );
          if (sameRefinement === undefined) {
            return [key, refinementedType, alternateType];
          }
          if (
            condition.operator === "||" &&
            sameRefinement[1] !== undefined &&
            sameRefinement[2] !== undefined
          ) {
            return [
              key,
              unionOfTypes(refinementedType, sameRefinement[1], typeScope),
              intersectionOfTypes(alternateType, sameRefinement[2], typeScope),
            ];
          }
          if (
            condition.operator === "&&" &&
            sameRefinement[1] !== undefined &&
            sameRefinement[2] !== undefined
          ) {
            return [
              key,
              intersectionOfTypes(
                refinementedType,
                sameRefinement[1],
                typeScope
              ),
              unionOfTypes(alternateType, sameRefinement[2], typeScope),
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
  moduleScope: ModuleScope,
  errors: Array<HegelError>
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
  const alternateScopes =
    Array.isArray(alternateScope) || alternateScope == undefined
      ? alternateScope
      : [alternateScope];
  const condition: ?Node = getCondition(currentRefinementNode);
  if (condition == undefined) {
    return;
  }
  let currentRefinements;
  try {
    currentRefinements = refinementByCondition(
      condition,
      currentScope,
      typeScope,
      moduleScope,
      primaryScope
    );
  } catch (e) {
    if (!(e instanceof HegelError)) {
      throw e;
    }
    errors.push(e);
  }
  if (!currentRefinements) {
    return;
  }
  currentRefinements.forEach((refinement) => {
    let [varName, refinementedType, alternateType] = refinement;
    const existed = currentScope.findVariable({ name: varName });
    if (!(existed.type instanceof UnionType)) {
      if (existed.type !== refinementedType) {
        refinementedType = new $Refinemented(refinementedType, existed.type);
      }
      if (existed.type !== alternateType) {
        alternateType = new $Refinemented(alternateType, existed.type);
      }
    }
    if (
      !primaryScope.body.has(varName) ||
      condition.type === NODE.SWITCH_CASE
    ) {
      primaryScope.body.set(
        varName,
        new VariableInfo(refinementedType, currentScope)
      );
    }
    if (alternateType && alternateScopes) {
      alternateScopes.forEach((alternateScope) => {
        if (
          !alternateScope.body.has(varName) ||
          condition.type === NODE.SWITCH_CASE
        ) {
          alternateScope.body.set(
            varName,
            new VariableInfo(alternateType, currentScope)
          );
        }
      });
    }
  });
  currentRefinementNode.isRefinemented = true;
}
