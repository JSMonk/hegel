// @flow
import NODE from "../utils/nodes";
import HegelError from "../utils/errors";
import { Type } from "../type-graph/types/type";
import { TypeVar } from "../type-graph/types/type-var";
import { TypeScope } from "../type-graph/type-scope";
import { UnionType } from "../type-graph/types/union-type";
import { ObjectType } from "../type-graph/types/object-type";
import { VariableInfo } from "../type-graph/variable-info";
import { VariableScope } from "../type-graph/variable-scope";
import { getMemberExressionTarget } from "../utils/common";
import { createObjectWith, mergeObjectsTypes } from "../utils/type-utils";
import {
  getPropertyChaining,
  getTypesFromVariants,
  mergeRefinementsVariants
} from "../utils/inference-utils";
import type { ModuleScope } from "../type-graph/module-scope";
import type {
  Node,
  MemberExpression,
  StringLiteral,
  Identifier
} from "@babel/parser";

type RefinemantableIn = {
  left: StringLiteral,
  right: Identifier
};

function inIdentifier(
  targetNode: Identifier,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  propertyName: string,
  refinementNode: Node
): ?[string, ?Type, ?Type] {
  const variable = currentScope.findVariable(targetNode);
  const type = variable.type;
  if (type instanceof UnionType) {
    const [refinementedVariants, alternateVariants] = type.variants.reduce(
      ([refinementedVariants, alternateVariants], variant) => {
        if (
          variant instanceof ObjectType &&
          variant.getPropertyType(propertyName)
        ) {
          return [refinementedVariants.concat([variant]), alternateVariants];
        }
        return [refinementedVariants, alternateVariants.concat([variant])];
      },
      [[], []]
    );
    return [
      targetNode.name,
      ...getTypesFromVariants(
        refinementedVariants,
        alternateVariants,
        typeScope
      )
    ];
  }
  if (
    type instanceof ObjectType &&
    !type.isStrict &&
    type.getPropertyType(targetNode.name) === null
  ) {
    return [
      targetNode.name,
      ObjectType.term(null, { isSoft: true }, [
        ...type.properties,
        [propertyName, new VariableInfo(Type.Unknown, currentScope)]
      ]),
      type
    ];
  }
}

function refinementProperty(
  variableName: string,
  variableType: Type,
  propertyName: string,
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
    const propertyType = property.type;
    if (isLast) {
      if (
        !(propertyType instanceof UnionType) &&
        !(propertyType instanceof ObjectType)
      ) {
        throw new HegelError(
          `Property has not "${propertyName}" property`,
          refinementNode.loc
        );
      }
      if (propertyType instanceof ObjectType) {
        const existed = propertyType.getPropertyType(propertyName);
        if (!propertyType.isStrict && !existed) {
          return [
            mergeObjectsTypes(
              propertyType,
              createObjectWith(propertyName, Type.Unknown, typeScope),
              typeScope
            ),
            property.type
          ];
        }
        return existed
          ? [propertyType, undefined]
          : [undefined, propertyType];
      }
      const [
        refinementedVariants,
        alternateVariants
      ] = propertyType.variants.reduce(
        ([refinementedVariants, alternateVariants], variant) =>
          variant instanceof ObjectType && variant.getPropertyType(propertyName)
            ? [refinementedVariants.concat([variant]), alternateVariants]
            : [refinementedVariants, alternateVariants.concat([variant])],
        [[], []]
      );
      const refinement = getTypesFromVariants(
        refinementedVariants,
        alternateVariants,
        typeScope
      );
      return mergeRefinementsVariants(
        refinement[0],
        refinement[1],
        new VariableInfo(
          ObjectType.term("{ }", {}, []),
          property.parent,
          property.meta
        ),
        currentPropertyName,
        typeScope
      );
    }
    return refinementProperty(
      variableName,
      property.type,
      propertyName,
      refinementNode,
      currentPropertyNameIndex + 1,
      chainingProperties,
      typeScope
    );
  }
  if (variableType instanceof UnionType) {
    const [
      refinementedVariants,
      alternateVariants
    ] = variableType.variants.reduce(
      ([refinementedVariants, alternateVariants], variant) => {
        const isNotAlternateVariant =
          variant instanceof ObjectType &&
          variant.getPropertyType(currentPropertyName);
        const refinementedTypeAndAlternateType = isNotAlternateVariant
          ? refinementProperty(
              variableName,
              variant,
              propertyName,
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
          alternateType
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
                )
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
                )
              ])
            : alternateVariants
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

function inProperty(
  targetNode: MemberExpression,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  propertyName: string,
  refinementNode: Node
): ?[string, Type, Type] {
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
    propertyName,
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
      `Property always ${
        refinmentedAndAlternate[0] === undefined ? "has not" : "has"
      } property "${propertyName}"`,
      refinementNode.loc
    );
  }
  return [variableName, refinmentedAndAlternate[0], refinmentedAndAlternate[1]];
}

export function inRefinement(
  currentRefinementNode: Node,
  currentScope: VariableScope | ModuleScope,
  typeScope: TypeScope,
  moduleScope: ModuleScope
): ?[string, Type, Type] {
  if (
    currentRefinementNode.left.type !== NODE.STRING_LITERAL ||
    (currentRefinementNode.right.type !== NODE.IDENTIFIER &&
      currentRefinementNode.right.type !== NODE.MEMBER_EXPRESSION)
  ) {
    return;
  }
  const {
    left: propertyNameNode,
    right: targetNode
  }: RefinemantableIn = currentRefinementNode;
  const propertyName = propertyNameNode.value;
  let refinementedType, alternateType, name;
  if (currentRefinementNode.right.type === NODE.IDENTIFIER) {
    const result = inIdentifier(
      currentRefinementNode.right,
      currentScope,
      typeScope,
      propertyName,
      currentRefinementNode
    );
    if (!result) {
      return;
    }
    [name, refinementedType, alternateType] = result;
  }
  if (currentRefinementNode.right.type === NODE.MEMBER_EXPRESSION) {
    const result = inProperty(
      currentRefinementNode.right,
      currentScope,
      typeScope,
      propertyName,
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
