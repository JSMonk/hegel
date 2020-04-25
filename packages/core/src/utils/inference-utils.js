// @flow
import NODE from "../utils/nodes";
import { UnionType } from "../type-graph/types/union-type";
import { createObjectWith, mergeObjectsTypes } from "./type-utils";
import type { Type } from "../type-graph/types/type";
import type { TypeScope } from "../type-graph/type-scope";
import type { ObjectType } from "../type-graph/types/object-type";
import type { VariableInfo } from "../type-graph/variable-info";
import type { MemberExpression } from "@babel/parser";

export function getTypesFromVariants(
  _refinementedVariants: Array<?Type>,
  _alternateVariants: Array<?Type>,
  typeScope: TypeScope
): [?Type, ?Type] {
  // $FlowIssue
  const refinementedVariants: Array<Type> = _refinementedVariants.filter(
    a => a != undefined
  );
  // $FlowIssue
  const alternateVariants: Array<Type> = _alternateVariants.filter(
    a => a != undefined
  );
  return [
    refinementedVariants.length
      ? UnionType.term(null, {}, refinementedVariants)
      : undefined,
    alternateVariants.length
      ? UnionType.term(null, {}, alternateVariants)
      : undefined
  ];
}

export function getPropertyChaining(node: MemberExpression): ?Array<string> {
  let memberPointer = node;
  const chaining: Array<string> = [];
  do {
    if (
      memberPointer.property.type !== NODE.IDENTIFIER ||
      memberPointer.computed
    ) {
      return;
    }
    chaining.unshift(
      memberPointer.property.name || memberPointer.property.value
    );
    memberPointer = memberPointer.object;
  } while (memberPointer.type === NODE.MEMBER_EXPRESSION);
  return chaining;
}

export function mergeRefinementsVariants(
  refinementedType: ?Type,
  alternateType: ?Type,
  originalProperty: VariableInfo<Type>,
  propertyName: string,
  typeScope: TypeScope
): [?Type, ?Type] {
  const nestedRefinementedType =
    refinementedType &&
    createObjectWith(
      propertyName,
      refinementedType,
      typeScope,
      originalProperty.meta
    );
  const nestedAlternateType =
    alternateType &&
    createObjectWith(
      propertyName,
      alternateType,
      typeScope,
      originalProperty.meta
    );
  return [
    nestedRefinementedType &&
      mergeObjectsTypes(
        // $FlowIssue
        originalProperty.type,
        nestedRefinementedType,
        typeScope
      ),
    nestedAlternateType &&
      // $FlowIssue
      mergeObjectsTypes(originalProperty.type, nestedAlternateType, typeScope)
  ];
}
