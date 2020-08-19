// @flow
import NODE from "../utils/nodes";
import HegelError from "../utils/errors";
import { Type } from "../type-graph/types/type";
import { TypeVar } from "../type-graph/types/type-var";
import { TypeScope } from "../type-graph/type-scope";
import { UnionType } from "../type-graph/types/union-type";
import { ObjectType } from "../type-graph/types/object-type";
import { VariableScope } from "../type-graph/variable-scope";
import { getMemberExressionTarget } from "../utils/common";
import {
  getPropertyChaining,
  getTypesFromVariants,
} from "../utils/inference-utils";
import { createObjectWith, mergeObjectsTypes } from "../utils/type-utils";
import type { ModuleScope } from "../type-graph/module-scope";
import type {
  Node,
  Identifier,
  BinaryExpression,
  MemberExpression,
} from "@babel/parser";

function instanceofIdentifier(
  targetNode: Identifier,
  constructor: Type,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  refinementNode: Node
): [string, ?Type, ?Type] {
  const variable = currentScope.findVariable(targetNode);
  const type = variable.type;
  if (
    !(type instanceof UnionType) &&
    type !== Type.Unknown &&
    !(type instanceof TypeVar) &&
    !type.isPrincipalTypeFor(constructor)
  ) {
    throw new HegelError(
      `Variable can't be an instance of "${refinementNode.right.name}"`,
      refinementNode.loc
    );
  }
  if (type.equalsTo(constructor)) {
    throw new HegelError(
      `Variable is always instance of "${refinementNode.right.name}"`,
      refinementNode.loc
    );
  }
  if (type === Type.Unknown || !(type instanceof UnionType)) {
    return [targetNode.name, constructor, type];
  }
  const [refinementedVariants, alternateVariants] = type.variants.reduce(
    ([refinementedVariants, alternateVariants], variant) =>
      constructor.isPrincipalTypeFor(variant)
        ? [refinementedVariants.concat([variant]), alternateVariants]
        : [refinementedVariants, alternateVariants.concat([variant])],
    [[], []]
  );
  return [
    targetNode.name,
    ...getTypesFromVariants(refinementedVariants, alternateVariants, typeScope),
  ];
}

function refinementProperty(
  variableName: string,
  variableType: Type,
  constructor: Type,
  refinementNode: Node,
  currentPropertyNameIndex: number,
  chainingProperties: Array<string>,
  typeScope: TypeScope
): ?[?Type, ?Type] {
  const currentPropertyName = chainingProperties[currentPropertyNameIndex];
  const isLast = currentPropertyNameIndex === chainingProperties.length - 1;
  if (variableType instanceof ObjectType) {
    const property = variableType.properties.get(currentPropertyName);
    if (property === undefined) {
      return;
    }
    if (isLast) {
      if (!(property.type instanceof UnionType)) {
        return constructor.isPrincipalTypeFor(property.type)
          ? [property.type, undefined]
          : [undefined, property.type];
      }
      const [
        refinementedVariants,
        alternateVariants,
      ] = property.type.variants.reduce(
        ([refinementedVariants, alternateVariants], variant) => {
          const refinmentedProperty =
            variant instanceof ObjectType
              ? variant.properties.get(currentPropertyName)
              : undefined;
          return refinmentedProperty &&
            constructor.isSuperTypeFor(refinementProperty.type)
            ? [refinementedVariants.concat([variant]), alternateVariants]
            : [refinementedVariants, alternateVariants.concat([variant])];
        },
        [[], []]
      );
      return getTypesFromVariants(
        refinementedVariants,
        alternateVariants,
        typeScope
      );
    }
    return refinementProperty(
      variableName,
      property.type,
      constructor,
      refinementNode,
      currentPropertyNameIndex + 1,
      chainingProperties,
      typeScope
    );
  }
  if (variableType instanceof UnionType) {
    const [
      refinementedVariants,
      alternateVariants,
    ] = variableType.variants.reduce(
      ([refinementedVariants, alternateVariants], variant) => {
        const isNotAlternateVariant =
          variant instanceof ObjectType &&
          variant.getPropertyType(currentPropertyName);
        const refinementedTypeAndAlternateType = isNotAlternateVariant
          ? refinementProperty(
              variableName,
              variant,
              constructor,
              refinementNode,
              currentPropertyNameIndex,
              chainingProperties,
              typeScope
            )
          : undefined;
        if (!refinementedTypeAndAlternateType) {
          return [refinementedVariants, alternateVariants.concat([variant])];
        }
        const [
          refinementedType,
          alternateType,
        ] = refinementedTypeAndAlternateType;
        return [
          refinementedType
            ? refinementedVariants.concat([
                mergeObjectsTypes(
                  (variant: any),
                  createObjectWith(
                    currentPropertyName,
                    refinementedType,
                    typeScope
                  ),
                  typeScope
                ),
              ])
            : refinementedVariants,
          alternateType
            ? alternateVariants.concat([
                mergeObjectsTypes(
                  (variant: any),
                  createObjectWith(
                    currentPropertyName,
                    alternateType,
                    typeScope
                  ),
                  typeScope
                ),
              ])
            : alternateVariants,
        ];
      },
      [[], []]
    );
    return getTypesFromVariants(
      refinementedVariants,
      alternateVariants,
      typeScope
    );
  }
}

function instanceofProperty(
  targetNode: Identifier,
  constructor: Type,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  refinementNode: Node
): ?[string, ?Type, ?Type] {
  const targetObject = getMemberExressionTarget(targetNode);
  if (targetObject.type !== NODE.IDENTIFIER) {
    return;
  }
  const variableName = targetObject.name;
  const propertiesChaining = getPropertyChaining(targetNode);
  const targetVariableInfo = currentScope.findVariable(targetObject);
  if (
    !variableName ||
    !targetVariableInfo ||
    !propertiesChaining ||
    targetVariableInfo instanceof VariableScope
  ) {
    return;
  }
  const refinmentedAndAlternate = refinementProperty(
    variableName,
    targetVariableInfo.type,
    constructor,
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
      } instance of "${refinementNode.right.name}"`,
      refinementNode.loc
    );
  }
  return [variableName, refinmentedAndAlternate[0], refinmentedAndAlternate[1]];
}

export function instanceofRefinement(
  currentRefinementNode: BinaryExpression,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  moduleScope: ModuleScope
): ?[string, Type, Type] {
  const { left: target, right: constructorNode } = currentRefinementNode;
  if (
    (target.type !== NODE.IDENTIFIER &&
      target.type !== NODE.MEMBER_EXPRESSION) ||
    constructorNode.type !== NODE.IDENTIFIER
  ) {
    return;
  }
  const constructor = currentScope.findVariable(constructorNode);
  if (
    !(
      constructor.type instanceof ObjectType &&
      constructor.type.instanceType !== null
    )
  ) {
    throw new HegelError(
      "Cannot apply instanceof to non-class type",
      constructorNode.loc
    );
  }
  const instanceType = constructor.type.instanceType;
  let refinementedType, alternateType, name;
  if (target.type === NODE.IDENTIFIER) {
    [name, refinementedType, alternateType] = instanceofIdentifier(
      target,
      instanceType,
      currentScope,
      typeScope,
      currentRefinementNode
    );
  }
  if (target.type === NODE.MEMBER_EXPRESSION) {
    const result = instanceofProperty(
      target,
      instanceType,
      currentScope,
      typeScope,
      currentRefinementNode
    );
    if (!result) {
      return;
    }
    [name, refinementedType, alternateType] = result;
  }
  return name && refinementedType && alternateType
    ? [name, refinementedType, alternateType]
    : undefined;
}
