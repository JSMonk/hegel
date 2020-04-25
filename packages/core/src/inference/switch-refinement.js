// @flow
import NODE from "../utils/nodes";
import HegelError from "../utils/errors";
import { UnionType } from "../type-graph/types/union-type";
import { VariableInfo } from "../type-graph/variable-info";
import { addCallToTypeGraph } from "../type-graph/call";
import type { Handler } from "../utils/traverse";
import type { SwitchStatement } from "@babel/parser";
import type { VariableScope } from "../type-graph/variable-scope";
import type { ModuleScope, PositionedModuleScope } from "../type-graph/module-scope";

export function findUnhandledCases(
  node: SwitchStatement,
  errors: Array<HegelError>,
  moduleScope: ModuleScope | PositionedModuleScope,
  currentScope: VariableScope | ModuleScope,
  parentNode: Node,
  pre: Handler,
  middle: Handler,
  post: Handler,
) {
  const { discriminant, cases } = node;
  // test equals null only if it's default case
  const hasDefaultCase = cases.some(switchCase => switchCase.test === null);
  if (
    // if switch statement doesn't have default case, we should check whether cases exhaustive or not
    hasDefaultCase ||
    (discriminant.type !== NODE.IDENTIFIER &&
     discriminant.type !== NODE.MEMBER_EXPRESSION)
  ) {
    return;
  }
  const { result: switchedValue } = addCallToTypeGraph(
    discriminant,
    moduleScope,
    currentScope,
    parentNode,
    pre,
    middle,
    post
  );
  const switchedValueType = switchedValue instanceof VariableInfo 
    ? switchedValue.type 
    : switchedValue;
  if (!(switchedValueType instanceof UnionType)) {
    return;
  } 
  let unmatchedVariants = [...switchedValueType.variants]

  cases.forEach(({ test }) => {
    const { result: matcherValue } = addCallToTypeGraph(
      test,
      moduleScope,
      currentScope,
      parentNode,
      pre,
      middle,
      post
    );
  const matcherValueType = matcherValue instanceof VariableInfo 
    ? matcherValue.type 
    : matcherValue;
    if (matcherValueType instanceof UnionType) {
      errors.push(
        new HegelError(
          'It is not safe to use variable which type is Union as case matcher, you should infer it value first',
          node.loc
        )
      );
    }

    unmatchedVariants = unmatchedVariants.filter(variant => !variant.equalsTo(matcherValueType))
  })

  if (unmatchedVariants.length !== 0) {
    const notMatchedCases = UnionType.getName(unmatchedVariants);

    errors.push(new HegelError(
      `This switch case statement is not exhaustive. Here is an example of a case that is not matched: ${notMatchedCases}`,
      node.loc
    ));
  }
}
