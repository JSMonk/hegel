// @flow
import NODE from "../utils/nodes";
import HegelError from "../utils/errors";
import { Type } from "../type-graph/types/type";
import { Scope } from "../type-graph/scope";
import { TypeVar } from "../type-graph/types/type-var";
import { UnionType } from "../type-graph/types/union-type";
import { ObjectType } from "../type-graph/types/object-type";
import { VariableInfo } from "../type-graph/variable-info";
import {
  getNameForType,
  createObjectWith,
  mergeObjectsTypes
} from "../utils/type-utils";
import { findVariableInfo, getMemberExressionTarget } from "../utils/common";
import {
  getPropertyChaining,
  getTypesFromVariants
} from "../utils/inference-utils";
import type { ModuleScope } from "../type-graph/module-scope";
import type {
  Node,
  Identifier,
  NullLiteral,
  MemberExpression
} from "@babel/parser";

function isIdentifierOrProperty(node: Node) {
  return (
    (node.type === NODE.IDENTIFIER && node.name !== "undefined") ||
    node.type === NODE.MEMBER_EXPRESSION
  );
}

function getEqualsArguments(
  left: Node,
  right: Node,
  refinementNode: Node
): ?{ target: Node, value: Node } {
  if (
    refinementNode.type !== NODE.BINARY_EXPRESSION ||
    !["===", "==", "!==", "!="].includes(refinementNode.operator)
  ) {
    return;
  }
  let target: ?Node = null;
  if (isIdentifierOrProperty(left)) {
    target = left;
  } else if (isIdentifierOrProperty(right)) {
    target = right;
  }
  let value: ?Node = null;
  if (isNullOrUndefined(left)) {
    value = left;
  } else if (isNullOrUndefined(right)) {
    value = right;
  }
  if (!target || !value) {
    return null;
  }
  return { value, target };
}

function isStrict(refinementNode: Node) {
  switch (refinementNode.operator) {
    case "===":
    case "!==":
      return true;
    case "==":
    case "!=":
      return false;
  }
  throw new Error("Never!");
}

function isNullOrUndefined(node: Node) {
  return (
    node.type === NODE.NULL_LITERAL ||
    (node.type === NODE.IDENTIFIER && node.name === "undefined")
  );
}

function getRefinmentType(
  value: Identifier | NullLiteral,
  refinementNode: Node
): Type {
  const VOID = new Type("void");
  const UNDEFINED = new Type("undefined", { isSubtypeOf: VOID });
  const NULL = new Type(null, { isSubtypeOf: VOID });
  const UNION = new UnionType(null, [UNDEFINED, NULL]);
  const strict = isStrict(refinementNode);
  if (value.type === NODE.IDENTIFIER && value.name === "undefined") {
    return strict ? UNDEFINED : UNION;
  }
  if (value.type === NODE.NULL_LITERAL) {
    return strict ? NULL : UNION;
  }
  throw new Error("Never!");
}

function equalsIdentifier(
  node: Identifier,
  currentScope: Scope | ModuleScope,
  typeScope: Scope,
  value: Identifier | NullLiteral,
  refinementNode: Node
): [string, Type, Type] {
  const variableName = node.name;
  const refinementType = getRefinmentType(value, refinementNode);
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
      : [[], []];
  if (
    !(variableInfo.type instanceof TypeVar) &&
    refinementedVariants.length === 0
  ) {
    throw new HegelError(
      `Type ${getNameForType(variableInfo.type)} can't be "${String(
        refinementType.name
      )}" type`,
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

export function refinePropertyWithConstraint(
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

function propertyWith(propertyName: string, propertyType: ?Type, propertyOwner: ObjectType, typeScope: Scope) {
  if (propertyType == undefined) {
    return propertyType;
  }
  const newPropertyOwner = createObjectWith(
    propertyName,
    propertyType,
    typeScope,
  );
  return mergeObjectsTypes(propertyOwner, newPropertyOwner, typeScope);
}

export function refinementProperty(
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
      return refinePropertyWithConstraint(
        chainingProperties.slice(currentPropertyNameIndex),
        refinementType,
        variableType,
        typeScope
      );
    }
    variableType = variableType.constraint;
  }
  if (variableType instanceof ObjectType) {
    const property = variableType.getPropertyType(currentPropertyName);
    if (property == null) {
      return;
    }
    if (isLast) {
      if (property instanceof UnionType) {
        const [
          refinementedVariants,
          alternateVariants
        ] = property.variants.reduce(
          ([refinementedVariants, alternateVariants], variant) =>
            refinementType.isPrincipalTypeFor(variant)
              ? [refinementedVariants.concat([variant]), alternateVariants]
              : [refinementedVariants, alternateVariants.concat([variant])],
          [[], []]
        );
        const [refinemented, alternate] = getTypesFromVariants(
          refinementedVariants,
          alternateVariants,
          typeScope
        );
        return [
          propertyWith(
            currentPropertyName,
            refinemented,
            variableType,
            typeScope
          ),
          propertyWith(
            currentPropertyName,
            alternate,
            variableType,
            typeScope
          ),
        ];
      }
      return refinementType.isPrincipalTypeFor(property)
        ? [variableType, undefined]
        : [undefined, variableType];
    }
    const nextIndex = currentPropertyNameIndex + 1;
    const nestedRefinement = refinementProperty(
      variableName,
      property,
      refinementType,
      refinementNode,
      nextIndex,
      chainingProperties,
      typeScope
    );
    if (!nestedRefinement) {
      return;
    }
    return [
      propertyWith(
        currentPropertyName,
        nestedRefinement[0],
        variableType,
        typeScope
      ),
      propertyWith(
        currentPropertyName,
        nestedRefinement[1],
        variableType,
        typeScope
      ),
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
                refinementedType
              ])
            : refinementedVariants,
          alternateType
            ? alternateVariants.concat([
                alternateType
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

function equalsProperty(
  node: MemberExpression,
  currentScope: Scope | ModuleScope,
  typeScope: Scope,
  value: Identifier | NullLiteral,
  refinementNode: Node
): ?[string, Type, Type] {
  const targetObject = getMemberExressionTarget(node);
  if (targetObject.type !== NODE.IDENTIFIER) {
    return;
  }
  const variableName = targetObject.name;
  const propertiesChaining = getPropertyChaining(node);
  const refinementType = getRefinmentType(value, refinementNode);
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
    const typeName = String(refinementType.name);
    throw new HegelError(
      `Property can't be "${typeName}" type or always have type "${typeName}"`,
      refinementNode.loc
    );
  }
  return [variableName, refinmentedAndAlternate[0], refinmentedAndAlternate[1]];
}
export function equalsRefinement(
  currentRefinementNode: Node,
  currentScope: Scope | ModuleScope,
  typeScope: Scope,
  moduleScope: ModuleScope
): ?[string, Type, Type] {
  const args = getEqualsArguments(
    currentRefinementNode.left,
    currentRefinementNode.right,
    currentRefinementNode
  );
  if (!args) {
    return;
  }
  const { target, value } = args;
  let refinementedType, alternateType, name;
  if (target.type === NODE.IDENTIFIER) {
    [name, refinementedType, alternateType] = equalsIdentifier(
      target,
      currentScope,
      typeScope,
      value,
      currentRefinementNode
    );
  }
  if (target.type === NODE.MEMBER_EXPRESSION) {
    const result = equalsProperty(
      target,
      currentScope,
      typeScope,
      value,
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
