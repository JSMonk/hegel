// @flow
import NODE from "../utils/nodes";
import HegelError from "../utils/errors";
import { Scope } from "../type-graph/scope";
import { Type } from "../type-graph/types/type";
import { TypeVar } from "../type-graph/types/type-var";
import { UnionType } from "../type-graph/types/union-type";
import { ObjectType } from "../type-graph/types/object-type";
import { FunctionType } from "../type-graph/types/function-type";
import { VariableInfo } from "../type-graph/variable-info";
import { CollectionType } from "../type-graph/types/collection-type";
import { findVariableInfo, getMemberExressionTarget } from "../utils/common";
import {
  getPropertyChaining,
  getTypesFromVariants
} from "../utils/inference-utils";
import {
  getNameForType,
  createObjectWith,
  mergeObjectsTypes
} from "../utils/type-utils";
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
    returnTypes.variants.some(type => type.name === node.value)
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
    case "string":
    case "boolean":
      return new Type(typeName);
    case "function":
      return new ObjectType("Function", []);
    case "object":
      return new ObjectType("Object", []);
  }
  throw new Error("Never!");
}

function typeofIdentifier(
  node: Identifier,
  currentScope: Scope | ModuleScope,
  typeScope: Scope,
  stringLiteral: string,
  refinementNode: Node
): [string, Type, Type] {
  const variableName = node.name;
  const refinementType = getRefinmentType(stringLiteral);
  const variableInfo = findVariableInfo(node, currentScope);
  const [refinementedVariants, alternateVariants] =
    variableInfo.type instanceof UnionType
      ? variableInfo.type.variants.reduce(
          ([refinementedVariants, alternateVariants], variant) =>
            refinementType.isPrincipalTypeFor(variant)
              ? [refinementedVariants.concat([variant]), alternateVariants]
              : [refinementedVariants, alternateVariants.concat([variant])],
          [[], []]
        )
      : [];
  if (
    !(variableInfo.type instanceof TypeVar) &&
    refinementedVariants.length === 0
  ) {
    throw new HegelError(
      `Type ${getNameForType(
        variableInfo.type
      )} can't be "${stringLiteral}" type`,
      refinementNode.loc
    );
  }
  let refinementedType;
  let alternateType;
  if (variableInfo.type instanceof UnionType) {
    refinementedType = UnionType.createTypeWithName(
      UnionType.getName(refinementedVariants),
      typeScope,
      refinementedVariants
    );
    alternateType = UnionType.createTypeWithName(
      UnionType.getName(alternateVariants),
      typeScope,
      alternateVariants
    );
  } else {
    refinementedType = refinementType;
    alternateType = variableInfo.type;
  }
  return [variableName, refinementedType, alternateType];
}

function typeofPropertyForTypeVarWithoutConstraint(
  chaining: Array<string>,
  refinementType: Type,
  variableType: TypeVar,
  typeScope: Scope
): [?Type, ?Type] {
  const refinementedType: Type = chaining.reduceRight((res: Type, property) => {
    const propertiesForObjectType = [[property, new VariableInfo(res)]];
    return ObjectType.createTypeWithName(
      ObjectType.getName(propertiesForObjectType),
      typeScope,
      propertiesForObjectType
    );
  }, refinementType);
  return [refinementedType, variableType];
}

function refinementProperty(
  variableName: string,
  variableType: Type,
  refinementType: Type,
  refinementNode: Node,
  currentPropertyNameIndex: number,
  chainingProperties: Array<string>,
  typeScope: Scope
): ?[?Type, ?Type] {
  const currentPropertyName = chainingProperties[currentPropertyNameIndex];
  const isLast = currentPropertyNameIndex === chainingProperties.length - 1;
  if (variableType instanceof TypeVar) {
    if (!variableType.constraint) {
      return typeofPropertyForTypeVarWithoutConstraint(
        chainingProperties.slice(currentPropertyNameIndex),
        refinementType,
        variableType,
        typeScope
      );
    }
    variableType = variableType.constraint;
  }
  if (variableType instanceof ObjectType) {
    const property = variableType.properties.get(currentPropertyName);
    if (property === undefined) {
      return;
    }
    if (isLast) {
      if (property.type instanceof UnionType) {
        const [
          refinementedVariants,
          alternateVariants
        ] = property.type.variants.reduce(
          ([refinementedVariants, alternateVariants], variant) =>
            refinementType.isSuperTypeFor(variant)
              ? [refinementedVariants.concat([variant]), alternateVariants]
              : [refinementedVariants, alternateVariants.concat([variant])],
          [[], []]
        );
        return getTypesFromVariants(
          refinementedVariants,
          alternateVariants,
          typeScope
        );
      }
      return refinementType.isPrincipalTypeFor(property.type)
        ? [property.type, undefined]
        : [undefined, property.type];
    }
    const nextIndex = currentPropertyNameIndex + 1;
    const nestedRefinement = refinementProperty(
      variableName,
      property.type,
      refinementType,
      refinementNode,
      nextIndex,
      chainingProperties,
      typeScope
    );
    if (!nestedRefinement) {
      return;
    }
    const nestedRefinementedType =
      nestedRefinement[0] &&
      createObjectWith(
        chainingProperties[nextIndex],
        nestedRefinement[0],
        typeScope,
        // $FlowIssue
        property.type.properties.get(chainingProperties[nextIndex]).meta
      );
    const nestedAlternateType =
      nestedRefinement[1] &&
      createObjectWith(
        chainingProperties[nextIndex],
        nestedRefinement[1],
        typeScope,
        // $FlowIssue
        property.type.properties.get(chainingProperties[nextIndex]).meta
      );
    return [
      nestedRefinementedType &&
        // $FlowIssue
        mergeObjectsTypes(property.type, nestedRefinementedType, typeScope),
      nestedAlternateType &&
        // $FlowIssue
        mergeObjectsTypes(property.type, nestedAlternateType, typeScope)
    ];
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
              refinementType,
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

function typeofProperty(
  node: MemberExpression,
  currentScope: Scope | ModuleScope,
  typeScope: Scope,
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
  const targetVariableInfo = findVariableInfo(targetObject, currentScope);
  if (
    !variableName ||
    !targetVariableInfo ||
    !propertiesChaining ||
    targetVariableInfo instanceof Scope
  ) {
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
  currentScope: Scope | ModuleScope,
  typeScope: Scope,
  moduleScope: ModuleScope
): ?[string, Type, Type] {
  const typeofOperator = findVariableInfo({ name: "typeof" }, moduleScope);
  if (!typeofOperator || typeofOperator instanceof Scope) {
    throw new Error("Never!");
  }
  if (!isEqualOperator(currentRefinementNode)) {
    return;
  }
  const args = getTypeofAndLiteral(
    currentRefinementNode.left,
    currentRefinementNode.right,
    typeofOperator
  );
  if (!args) {
    return;
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
