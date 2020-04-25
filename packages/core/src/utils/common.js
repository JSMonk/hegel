// @flow
import NODE from "./nodes";
import type { Node, Declaration, MemberExpression } from "@babel/parser";

export const getAnonymousKey = (node: Node) =>
  `[[Anonymuos${node.loc.start.line}-${node.loc.start.column}]]`;

export const getDeclarationName = (node: Declaration): string => node.id.name;

type ValidKey<T> = string | number | T;

export function unique<T>(
  arr: Array<T>,
  getKey: T => ValidKey<T> = x => x
): Array<T> {
  const filterObject: { [key: ValidKey<T>]: T } = {};
  for (let i = 0; i < arr.length; i++) {
    const key = getKey(arr[i]);
    filterObject[key] = arr[i];
  }
  return (Object.values(filterObject): any);
}

export function intersection<T>(
  arr1: Array<T>,
  arr2: Array<T>,
  isEquals: (T, T) => boolean = (a, b) => a === b
): [Array<T>, Array<T>] {
  const intersectionResult = [];
  const exclusiveOr = [];
  for (let i = 0; i < arr1.length; i++) {
    for (let j = 0; j < arr2.length; j++) {
      if (!isEquals(arr1[i], arr2[j])) {
        exclusiveOr.push(arr1[i], arr2[j]);
        continue;
      }
      intersectionResult.push(arr2[j]);
    }
  }
  return [intersectionResult, exclusiveOr];
}

export function union<T>(
  arr1: Array<T>,
  arr2: Array<T>,
  isEquals: (T, T) => boolean = (a, b) => a === b
): Array<T> {
  const unionResult = [];
  for (let i = 0; i < arr1.length; i++) {
    for (let j = 0; j < arr2.length; j++) {
      if (isEquals(arr1[i], arr2[j])) {
        unionResult.push(arr2[j]);
        continue;
      }
      unionResult.push(arr2[j]);
    }
  }
  return unionResult;
}

export function getMemberExressionTarget(node: MemberExpression): Node {
  let target = node;
  do {
    target = target.object;
  } while (target.type === NODE.MEMBER_EXPRESSION);
  return target;
}

export function ensureArray<T>(value: T | Array<T> | null | undefined): Array<T> {
  if (value === undefined || value === null) {
    return []
  }
  return Array.isArray(value) ? value : [value];
}