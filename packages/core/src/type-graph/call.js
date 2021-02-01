// @flow
import NODE from "../utils/nodes";
import HegelError from "../utils/errors";
import { Meta } from "./meta/meta";
import { Type } from "./types/type";
import { $Keys } from "./types/keys-type";
import { $Values } from "./types/values-type";
import { TypeVar } from "./types/type-var";
import { CallMeta } from "./meta/call-meta";
import { TupleType } from "./types/tuple-type";
import { TypeScope } from "./type-scope";
import { UnionType } from "./types/union-type";
import { ObjectType } from "./types/object-type";
import { GenericType } from "./types/generic-type";
import { $BottomType } from "./types/bottom-type";
import { VariableInfo } from "./variable-info";
import { $PropertyType } from "./types/property-type";
import { VariableScope } from "./variable-scope";
import { $Refinemented } from "./types/refinemented-type";
import { CollectionType } from "../type-graph/types/collection-type";
import { isCallableType } from "../utils/function-utils";
import { getAnonymousKey } from "../utils/common";
import { $AppliedImmutable } from "./types/immutable-type";
import { inferenceTypeForNode } from "../inference";
import { pickFalsy, pickTruthy } from "../utils/type-utils";
import { addFunctionToTypeGraph } from "../utils/function-utils";
import { FunctionType, RestArgument } from "./types/function-type";
import { getVariableType, getPropertyName } from "../utils/variable-utils";
import { ModuleScope, PositionedModuleScope } from "./module-scope";
import { addToThrowable, findThrowableBlock } from "../utils/throwable";
import { THIS_TYPE, CALLABLE, CONSTRUCTABLE } from "./constants";
import {
  getRawFunctionType,
  getInvocationType,
} from "../inference/function-type";
import {
  getWrapperType,
  getIteratorValueType,
  getTypeFromTypeAnnotation,
} from "../utils/type-utils";
import {
  getParentForNode,
  findNearestTypeScope,
  findNearestScopeByType,
} from "../utils/scope-utils";
import type { Handler } from "../utils/traverse";
import type { CallableArguments } from "./meta/call-meta";
import type {
  Node,
  ClassMethod,
  ObjectMethod,
  ClassProperty,
  ObjectProperty,
  SourceLocation,
} from "@babel/core";

type CallResult = {
  inferenced?: boolean,
  result: CallableArguments,
};

type CallableMeta = {
  isForAssign?: boolean,
  isForInit?: boolean,
  isTypeDefinitions?: boolean,
  isImmutable?: boolean,
  skipAddingCalls?: boolean,
};

export function addCallToTypeGraph(
  node: ?Node,
  moduleScope: ModuleScope | PositionedModuleScope,
  currentScope: VariableScope | ModuleScope,
  parentNode: Node,
  pre: Handler,
  middle: Handler,
  post: Handler,
  meta?: CallableMeta = {}
): CallResult {
  let target: VariableInfo<any> | ?Type = null;
  let inferenced = undefined;
  let isFinal = undefined;
  let targetName: string = "";
  let args: Array<CallableArguments> | null = null;
  let argsLocations: Array<SourceLocation> = [];
  let genericArguments: Array<CallableArguments> | null = null;
  const typeScope = findNearestTypeScope(currentScope, moduleScope);
  const withPositions = moduleScope instanceof PositionedModuleScope;
  if (node == null) {
    return {
      result: Type.Undefined,
      inferenced: false,
    };
  }
  if (node.type === NODE.EXPRESSION_STATEMENT) {
    node = node.expression;
  }
  if (node.type === NODE.SUPER) {
    node = { type: NODE.IDENTIFIER, name: "super", loc: node.loc };
  }
  if (node.operator === "delete") {
    node = {
      loc: node.loc,
      type: NODE.ASSIGNMENT_EXPRESSION,
      operator: "=",
      // $FlowIssue
      left: node.argument,
      right: {
        type: NODE.IDENTIFIER,
        name: "undefined",
        loc: node.loc,
      },
    };
  }
  switch (node.type) {
    case NODE.TYPE_CAST:
      throw new HegelError("Type cast does not exist in Hegel", node.loc);
    case NODE.TEMPLATE_LITERAL:
      args = node.expressions.map(
        (expression) =>
          addCallToTypeGraph(
            expression,
            moduleScope,
            currentScope,
            parentNode,
            pre,
            middle,
            post,
            meta
          ).result
      );
      argsLocations = node.expressions.map((node) => node.loc);
      targetName = "tamplate literal";
      target = new FunctionType(
        targetName,
        {},
        args.map(() => Type.String),
        Type.String
      );
      break;
    case NODE.IF_STATEMENT:
      target = currentScope.findVariable({ name: "if", loc: node.loc });
      args = [
        addCallToTypeGraph(
          node.test,
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result,
      ];
      break;
    case NODE.WHILE_STATEMENT:
      target = currentScope.findVariable({ name: "while", loc: node.loc });
      args = [
        addCallToTypeGraph(
          node.test,
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result,
      ];
      break;
    case NODE.DO_WHILE_STATEMENT:
      target = currentScope.findVariable({ name: "do-while", loc: node.loc });
      args = [
        addCallToTypeGraph(
          node.test,
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result,
      ];
      break;
    case NODE.FOR_STATEMENT:
      target = currentScope.findVariable({ name: "for", loc: node.loc });
      args = [
        Type.Unknown,
        node.test
          ? addCallToTypeGraph(
              node.test,
              moduleScope,
              // $FlowIssue
              moduleScope.scopes.get(VariableScope.getName(node.body)),
              parentNode,
              pre,
              middle,
              post,
              meta
            ).result
          : Type.Undefined,
        Type.Unknown,
      ];
      break;
    case NODE.FUNCTION_EXPRESSION:
    case NODE.ARROW_FUNCTION_EXPRESSION:
    case NODE.IDENTIFIER:
      const nodeName =
        node.type === NODE.IDENTIFIER
          ? node
          : { name: getAnonymousKey(node), loc: node.loc };
      const varInfo = currentScope.findVariable(
        nodeName,
        parentNode,
        moduleScope,
        pre,
        middle,
        post
      );
      if (withPositions && node.type === NODE.IDENTIFIER) {
        // $FlowIssue
        moduleScope.addPosition(node, varInfo);
      }
      return { result: varInfo };
    case NODE.CLASS_PROPERTY:
    case NODE.CLASS_PRIVATE_PROPERTY:
    case NODE.OBJECT_PROPERTY:
      const self = currentScope.findVariable({ name: THIS_TYPE });
      // $FlowIssue
      let selfObject: ObjectType = node.static
        ? // $FlowIssue
          self.parent.declaration.type
        : // $FlowIssue
          self.type;
      selfObject =
        selfObject instanceof $BottomType
          ? selfObject.subordinateMagicType.subordinateType
          : selfObject;
      const _propertyName = getPropertyName(node, (node) =>
        addCallToTypeGraph(
          node,
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          { ...meta, skipAddingCalls: true }
        )
      );
      const propertyType = selfObject.properties.get(_propertyName);
      if (propertyType === undefined) {
        throw new Error("Never!!!");
      }
      const value =
        node.value === null
          ? {
              result: Type.Undefined,
              inferenced: false,
            }
          : addCallToTypeGraph(
              node.value,
              moduleScope,
              currentScope,
              parentNode,
              pre,
              middle,
              post,
              meta
            );
      inferenced = value.inferenced;
      args = [
        node.typeAnnotation != null ? propertyType : value.result,
        value.result,
      ];
      targetName = "=";
      target = currentScope.findVariable({ name: targetName, loc: node.loc });
      break;
    case NODE.VARIABLE_DECLARATOR:
      const variableType = currentScope.findVariable(node.id);
      if (withPositions) {
        // $FlowIssue
        moduleScope.addPosition(node.id, variableType);
      }
      currentScope.body.delete(node.id.name);
      const init =
        node.init === null
          ? {
              result: Type.Undefined,
              inferenced: false,
            }
          : addCallToTypeGraph(
              node.init,
              moduleScope,
              currentScope,
              parentNode,
              pre,
              middle,
              post,
              {
                ...meta,
                isImmutable: variableType.type instanceof $AppliedImmutable,
              }
            );
      currentScope.body.set(node.id.name, variableType);
      inferenced = init.inferenced;
      targetName = "init";
      args = [variableType, init.result];
      target = currentScope.findVariable({ name: "=", loc: node.loc }).type;
      target =
        target instanceof GenericType && node.id.typeAnnotation != undefined
          ? target.applyGeneric([variableType.type])
          : target;
      break;
    case NODE.THROW_STATEMENT:
      const error = addCallToTypeGraph(
        node.argument,
        moduleScope,
        currentScope,
        parentNode,
        pre,
        middle,
        post,
        meta
      );
      args = [
        getVariableType(
          undefined,
          error.result instanceof VariableInfo
            ? error.result.type
            : error.result,
          typeScope,
          error.inferenced
        ),
      ];
      targetName = "throw";
      target = currentScope.findVariable(
        { name: targetName, loc: node.loc },
        parentNode,
        moduleScope,
        pre,
        middle,
        post
      );
      const nearestFn = findNearestScopeByType(
        VariableScope.FUNCTION_TYPE,
        currentScope
      );
      isFinal =
        nearestFn instanceof ModuleScope ||
        currentScope === nearestFn ||
        currentScope
          .getParentsUntil(nearestFn)
          .every(
            (parent) =>
              parent.creator === "block" ||
              parent.creator === "catch" ||
              parent.creator === "default-case"
          );
      const nearestThrowableScope = findThrowableBlock(currentScope);
      const throwableDeclaration =
        nearestThrowableScope && nearestThrowableScope.declaration;
      if (nearestThrowableScope != null) {
        addToThrowable(args[0], nearestThrowableScope);
      }
      if (isFinal && currentScope !== nearestFn) {
        nearestFn.calls.push(
          new CallMeta(undefined, [], node.loc, "throw", typeScope, false, true)
        );
      }
      if (
        nearestThrowableScope == null ||
        nearestThrowableScope.type !== VariableScope.FUNCTION_TYPE ||
        throwableDeclaration == undefined
      ) {
        break;
      }
      // $FlowIssue
      const currentTargetType: GenericType = target.type;
      const declarationType =
        throwableDeclaration.type instanceof GenericType
          ? throwableDeclaration.type.subordinateType
          : throwableDeclaration.type;
      if (declarationType instanceof ObjectType) {
        throw new Error("Never!!!");
      }
      if (declarationType.throwable !== undefined) {
        target = currentTargetType.applyGeneric([declarationType.throwable]);
      }
      break;
    case NODE.AWAIT_EXPRESSION:
      args = [
        addCallToTypeGraph(
          node.argument,
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result,
      ];
      targetName = "await";
      target = currentScope.findVariable(
        { name: targetName, loc: node.loc },
        parentNode,
        moduleScope,
        pre,
        middle,
        post
      );
      break;
    case NODE.LOGICAL_EXPRESSION:
      if (node.operator !== "??") {
        args = [
          addCallToTypeGraph(
            node.left.body,
            moduleScope,
            // $FlowIssue
            moduleScope.scopes.get(VariableScope.getName(node.left)),
            node.left,
            pre,
            middle,
            post,
            meta
          ).result,
          addCallToTypeGraph(
            node.right.body,
            moduleScope,
            // $FlowIssue
            moduleScope.scopes.get(VariableScope.getName(node.right)),
            node.right,
            pre,
            middle,
            post,
            meta
          ).result,
        ];
        let leftArg = args[0];
        leftArg = leftArg instanceof VariableInfo ? leftArg.type : leftArg;
        leftArg =
          node.operator === "&&" ? pickFalsy(leftArg) : pickTruthy(leftArg);
        args[0] = leftArg || args[0];
      }
    case NODE.BINARY_EXPRESSION:
      args = args || [
        addCallToTypeGraph(
          node.left,
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result,
        addCallToTypeGraph(
          node.right,
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result,
      ];
      targetName = node.operator === "+" ? "b+" : node.operator;
      targetName = node.operator === "-" ? "b-" : targetName;
      target = currentScope.findVariable({ name: targetName, loc: node.loc });
      break;
    case NODE.ASSIGNMENT_EXPRESSION:
    case NODE.ASSIGNMENT_PATTERN:
      const right = addCallToTypeGraph(
        node.right,
        moduleScope,
        currentScope,
        parentNode,
        pre,
        middle,
        post,
        meta
      );
      const left = addCallToTypeGraph(
        node.left,
        moduleScope,
        currentScope,
        parentNode,
        pre,
        middle,
        post,
        { ...meta, isForAssign: true }
      );
      args = [left.result, right.result];
      if (left.result instanceof VariableInfo && left.result.isConstant) {
        throw new HegelError(
          "Cannot assign to variable because it is a constant.",
          node.loc
        );
      }
      targetName = node.operator || "=";
      target = currentScope.findVariable({ name: targetName, loc: node.loc })
        .type;
      target =
        target instanceof GenericType &&
        (node.type !== NODE.ASSIGNMENT_PATTERN ||
          node.left.typeAnnotation != undefined)
          ? // $FlowIssue
            target.applyGeneric([left.result.type || left.result])
          : target;
      inferenced = right.inferenced;
      break;
    case NODE.RETURN_STATEMENT:
      targetName = "return";
      const fn: any = findNearestScopeByType(
        VariableScope.FUNCTION_TYPE,
        currentScope
      );
      if (fn instanceof ModuleScope) {
        throw new HegelError("Call return outside a function", node.loc);
      }
      const arg = addCallToTypeGraph(
        node.argument,
        moduleScope,
        currentScope,
        parentNode,
        pre,
        middle,
        post,
        meta
      );
      inferenced = arg.inferenced;
      let argType =
        arg.result instanceof VariableInfo ? arg.result.type : arg.result;
      if (argType instanceof $Refinemented) {
        if (!argType.isSafe()) {
          throw new HegelError("You try to return unsafly refinemented object, which mean that somebody could change prooved property type outside the function.", node.loc);
        }
        argType = argType.refinemented;
      }
      let fType = fn.declaration.type;
      fType = fType instanceof GenericType ? fType.subordinateType : fType;
      args = [
        fType.isAsync && !argType.isPromise() ? argType.promisify() : argType,
      ];
      const declaration =
        fn.declaration.type instanceof GenericType
          ? fn.declaration.type.subordinateType
          : fn.declaration.type;
      target = currentScope.findVariable(
        { name: targetName, loc: node.loc },
        parentNode,
        moduleScope,
        pre,
        middle,
        post
      );
      // $FlowIssue
      target = target.type.subordinateType.changeAll(
        // $FlowIssue
        target.type.genericArguments,
        [declaration.returnType]
      );
      isFinal =
        currentScope === fn ||
        currentScope
          .getParentsUntil(fn)
          .every(
            (parent) =>
              parent.creator === "block" || parent.creator === "default-case"
          );
      currentScope = fn;
      break;
    case NODE.UNARY_EXPRESSION:
    case NODE.UPDATE_EXPRESSION:
      targetName = node.operator;
      args = [
        addCallToTypeGraph(
          node.argument,
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result,
      ];
      target = currentScope.findVariable({ name: targetName, loc: node.loc });
      break;
    case NODE.PURE_KEY:
      args = [
        addCallToTypeGraph(
          node.of,
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result,
      ];
      targetName = "Object.keys";
      args = args.map((a) => (a instanceof VariableInfo ? a.type : a));
      target = new $Keys().applyGeneric(args, node.loc);
      // $FlowIssue
      target = new FunctionType(targetName, {}, args, target);
      break;
    case NODE.PURE_VALUE:
    case NODE.VALUE:
      target = addCallToTypeGraph(
        node.of,
        moduleScope,
        currentScope,
        parentNode,
        pre,
        middle,
        post,
        meta
      ).result;
      const maybeIterableType =
        target instanceof VariableInfo ? target.type : target;
      return {
        result: getIteratorValueType(maybeIterableType, node.of),
      };
    case NODE.MEMBER_EXPRESSION:
      const propertyName =
        node.property.type === NODE.PRIVATE_NAME
          ? `#${node.property.id.name}`
          : node.property.name;
      const isNotComputed =
        (node.property.type === NODE.IDENTIFIER ||
          node.property.type === NODE.PRIVATE_NAME) &&
        !node.computed;
      args = [
        getWrapperType(
          addCallToTypeGraph(
            node.object,
            moduleScope,
            currentScope,
            parentNode,
            pre,
            middle,
            post,
            meta
          ).result,
          moduleScope
        ),
        isNotComputed
          ? Type.term(`'${propertyName}'`, { isSubtypeOf: Type.String })
          : addCallToTypeGraph(
              node.property,
              moduleScope,
              currentScope,
              parentNode,
              pre,
              middle,
              post,
              meta
            ).result,
      ];
      targetName = ".";
      genericArguments = args.map((t) =>
        t instanceof VariableInfo ? t.type : t
      );
      const lts = new TypeScope(typeScope);
      const argsTypes = [
        TypeVar.new("A", { parent: lts }, undefined, undefined, true),
        TypeVar.new("B", { parent: lts }, undefined, undefined, true),
      ];
      const property = new $BottomType(
        { isForAssign: meta.isForAssign },
        new $PropertyType("", {}, meta.isForInit),
        genericArguments
      );
      target = GenericType.term(
        `<A, B>(A, B) => ${String(property.name)}`,
        {},
        argsTypes,
        lts,
        new FunctionType("", {}, argsTypes, property)
      );
      break;
    case NODE.CONDITIONAL_EXPRESSION:
      args = [
        addCallToTypeGraph(
          node.test,
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result,
        addCallToTypeGraph(
          node.consequent.body,
          moduleScope,
          // $FlowIssue
          moduleScope.scopes.get(VariableScope.getName(node.consequent)),
          node.consequent,
          pre,
          middle,
          post,
          meta
        ).result,
        addCallToTypeGraph(
          node.alternate.body,
          moduleScope,
          // $FlowIssue
          moduleScope.scopes.get(VariableScope.getName(node.alternate)),
          node.alternate,
          pre,
          middle,
          post,
          meta
        ).result,
      ];
      targetName = "?:";
      target = currentScope.findVariable({ name: targetName, loc: node.loc });
      break;
    case NODE.NEW_EXPRESSION:
      const argument = addCallToTypeGraph(
        node.callee,
        moduleScope,
        currentScope,
        parentNode,
        pre,
        middle,
        post,
        meta
      ).result;
      const argumentType =
        argument instanceof VariableInfo ? argument.type : argument;
      const potentialArgument = addCallToTypeGraph(
        { ...node, type: NODE.CALL_EXPRESSION, isConstructor: true },
        moduleScope,
        currentScope,
        parentNode,
        pre,
        middle,
        post,
        meta
      ).result;
      const defaultObject = ObjectType.term("{  }", {}, []);
      args = [
        ObjectType.Object.isPrincipalTypeFor(potentialArgument)
          ? potentialArgument
          : defaultObject,
      ];
      targetName = "new";
      target = currentScope.findVariable({ name: targetName, loc: node.loc });
      break;
    case NODE.TAGGED_TEMPLATE_EXPRESSION:
      node = {
        loc: node.loc,
        type: NODE.CALL_EXPRESSION,
        callee: node.tag,
        arguments: [
          {
            type: NODE.ARRAY_EXPRESSION,
            loc: node.quasi.loc,
            elements: node.quasi.quasis.map((a) => ({
              ...a,
              type: NODE.STRING_LITERAL,
              value: a.value.raw,
            })),
          },
          ...node.quasi.expressions,
        ],
      };
    case NODE.CALL_EXPRESSION:
      if (
        node.callee.type === NODE.IDENTIFIER ||
        node.callee.type === NODE.THIS_EXPRESSION ||
        node.callee.type === NODE.SUPER
      ) {
        targetName = node.callee.name;
        if (node.callee.type === NODE.SUPER) {
          targetName = "super";
        }
        if (node.callee.type === NODE.THIS_EXPRESSION) {
          targetName = THIS_TYPE;
        }
        target = currentScope.findVariable(
          { name: targetName, loc: node.callee.loc },
          parentNode,
          moduleScope,
          pre,
          middle,
          post
        );
        if (withPositions) {
          // $FlowIssue
          moduleScope.addPosition(node.callee, target);
        }
      } else {
        target = (addCallToTypeGraph(
          node.callee,
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          meta
        ).result: any);
      }
      let targetType: Type =
        target instanceof VariableInfo ? target.type : target;
      targetType =
        targetType instanceof $AppliedImmutable
          ? targetType.readonly
          : targetType;
      targetType =
        targetType instanceof $BottomType
          ? targetType.unpack(node.loc)
          : targetType;
      if (
        !(targetType instanceof FunctionType) &&
        !(
          targetType instanceof GenericType &&
          targetType.subordinateType instanceof FunctionType
        )
      ) {
        target =
          targetType.getPropertyType(
            node.isConstructor ? CONSTRUCTABLE : CALLABLE
          ) || target;
        target =
          typeof targetType === "string"
            ? VariableScope.addAndTraverseNodeWithType(
                // $FlowIssue
                undefined,
                target,
                parentNode,
                moduleScope,
                pre,
                middle,
                post
              )
            : target;
        target =
          target instanceof VariableInfo
            ? target
            : // $FlowIssue
              new VariableInfo(target, currentScope);
        targetType = target.type !== undefined ? target.type : targetType;
      }
      genericArguments =
        node.typeArguments &&
        node.typeArguments.params.map((arg) =>
          getTypeFromTypeAnnotation(
            { typeAnnotation: arg },
            typeScope,
            currentScope,
            false,
            null,
            parentNode,
            moduleScope,
            pre,
            middle,
            post
          )
        );
      const localTypeScope =
        targetType instanceof GenericType
          ? targetType.localTypeScope
          : typeScope;
      if (targetType instanceof GenericType && genericArguments != null) {
        targetType = getRawFunctionType(
          // $FlowIssue
          targetType,
          [],
          genericArguments,
          localTypeScope,
          node.loc
        );
      }
      let fnType =
        targetType instanceof GenericType
          ? targetType.subordinateType
          : targetType;
      if (
        fnType != undefined &&
        !(fnType instanceof FunctionType) &&
        !(fnType instanceof TypeVar && !fnType.isUserDefined)
      ) {
        throw new HegelError(
          fnType instanceof UnionType && fnType.variants.every(isCallableType)
            ? `Signatures of each variant of type "${String(
                fnType.name
              )}" are not compatible with each other`
            : `The type "${String(fnType.name)}" is not callable.`,
          node.loc
        );
      }
      const providedArgumentsLength = node.arguments.length;
      args = node.arguments.map((n, i) => {
        argsLocations.push(n.loc);
        // $FlowIssue
        const defaultArguments = (fnType.argumentsTypes || []);
        const defaultArg = defaultArguments[i];
        if (
          n.type === NODE.FUNCTION_EXPRESSION ||
          n.type === NODE.ARROW_FUNCTION_EXPRESSION
        ) {
          return defaultArg;
        }
        const isSpreadElement = n.type === NODE.SPREAD_ELEMENT;
        if (isSpreadElement) {
          n = n.argument;
        }
        const { result } = addCallToTypeGraph(
          n,
          moduleScope,
          currentScope,
          parentNode,
          pre,
          middle,
          post,
          { ...meta, isImmutable: defaultArg instanceof $AppliedImmutable }
        );
        if (isSpreadElement) {
          let resultType =
            result instanceof VariableInfo ? result.type : result;
          resultType = resultType.getOponentType(resultType);
          if (resultType instanceof TupleType) {
            return resultType.items;
          }
          const length = defaultArguments.length - i;
          if (fnType instanceof TypeVar && !fnType.isUserDefined) {
            return [new RestArgument(null, {}, resultType)];
          }
          const restOfArguments = Array.from({ length });
          if (resultType instanceof CollectionType) {
            return restOfArguments.fill(
              defaultArg instanceof RestArgument
                ? resultType.valueType
                : UnionType.term(null, {}, [
                    Type.Undefined,
                    resultType.valueType,
                  ])
            );
          }
          const element = getIteratorValueType(resultType, n.loc);
          return restOfArguments.fill(
            UnionType.term(null, {}, [Type.Undefined, element])
          );
        }
        return result;
      });
      targetType.asNotUserDefined();
      args = node.arguments.flatMap((n, i) => {
        if (
          n.type !== NODE.FUNCTION_EXPRESSION &&
          n.type !== NODE.ARROW_FUNCTION_EXPRESSION
        ) {
          const element = args[i];
          // $FlowIssue
          return element instanceof Array ? element : [element];
        }
        let expectedType =
          fnType instanceof FunctionType ? fnType.argumentsTypes[i] : undefined;
        // We need it for right type inference of the argument function
        if (targetType instanceof GenericType) {
          const existedGenericArguments =
            expectedType instanceof GenericType
              ? expectedType.genericArguments
              : [];
          const subordinateType =
            expectedType instanceof GenericType
              ? expectedType.subordinateType
              : expectedType;
          expectedType = new GenericType(
            "",
            {},
            [...existedGenericArguments, ...targetType.genericArguments],
            new TypeScope(),
            subordinateType
          );
        }
        const result = VariableScope.addAndTraverseNodeWithType(
          // $FlowIssue
          expectedType,
          n,
          parentNode,
          moduleScope,
          pre,
          middle,
          post
        );
        return [result];
      });
      fnType = getRawFunctionType(
        // $FlowIssue
        targetType,
        args,
        genericArguments,
        localTypeScope,
        node.loc
      );
      targetType.asUserDefined();
      const throwableType: any =
        targetType instanceof GenericType
          ? targetType.subordinateType
          : targetType;
      if (
        throwableType.throwable !== undefined &&
        !(currentScope instanceof ModuleScope)
      ) {
        const nearestThrowableScope = findThrowableBlock(currentScope);
        if (nearestThrowableScope != undefined) {
          addToThrowable(throwableType.throwable, nearestThrowableScope);
          if (nearestThrowableScope.type === VariableScope.FUNCTION_TYPE) {
            const declaration = nearestThrowableScope.declaration;
            if (declaration === undefined) {
              throw new Error("Never!!!");
            }
            const declarationType =
              declaration.type instanceof GenericType
                ? declaration.type.subordinateType
                : declaration.type;
            if (declarationType instanceof ObjectType) {
              throw new Error("Never!!!");
            }
            const declaratedThrowable = declarationType.throwable;
            if (
              declaratedThrowable !== undefined &&
              !declaratedThrowable.isPrincipalTypeFor(throwableType.throwable)
            ) {
              throw new HegelError(
                `Current function throws "${String(
                  throwableType.throwable.name
                )}" type which is incompatible with declareted throw type "${String(
                  declaratedThrowable.name
                )}"`,
                node.loc
              );
            }
          }
        }
      }
      if (genericArguments != null || target.type instanceof $BottomType) {
        target = fnType;
      }
      inferenced =
        targetType instanceof GenericType &&
        targetType.subordinateType.returnType instanceof TypeVar;
      break;
    case NODE.THIS_EXPRESSION:
      const selfVar = currentScope.findVariable({
        name: THIS_TYPE,
        loc: node.loc,
      });
      const nearestFunctionScope = findNearestScopeByType(
        VariableScope.FUNCTION_TYPE,
        currentScope
      );
      nearestFunctionScope.calls.push(
        new CallMeta(undefined, [], node.loc, "this", typeScope)
      );
      return {
        result:
          selfVar.type instanceof $BottomType
            ? selfVar.type.subordinateMagicType.subordinateType
            : selfVar.type,
        inferenced: false,
      };
    case NODE.SEQUENCE_EXPRESSION:
      return addCallToTypeGraph(
        node.expressions[node.expressions.length - 1],
        moduleScope,
        currentScope,
        parentNode,
        pre,
        middle,
        post,
        meta
      );
    default:
      return {
        result: inferenceTypeForNode(
          node,
          typeScope,
          currentScope,
          moduleScope,
          parentNode,
          pre,
          middle,
          post,
          meta.isTypeDefinitions,
          meta.isImmutable
        ),
        isLiteral: true,
        inferenced: true,
      };
  }
  if (target === null || args === null) {
    throw new Error("Never!!!");
  }
  const targetType = target instanceof VariableInfo ? target.type : target;
  const options = {
    pre,
    args,
    meta,
    node,
    post,
    middle,
    target,
    moduleScope,
    typeScope,
    targetType,
    parentNode,
    dropUnknown: targetName === "=" || targetName === "init",
    genericArguments:
      genericArguments &&
      genericArguments.map((a) => (a instanceof Type ? a : a.type)),
  };
  const getResult = (targetType) => {
    const { result, inferenced: localInferenced } = invoke({
      ...options,
      targetType,
    });
    inferenced = inferenced || localInferenced;
    return result;
  };
  const result =
    targetType instanceof UnionType
      ? UnionType.term(null, {}, targetType.variants.map(getResult))
      : getResult(targetType);
  if (!meta.skipAddingCalls) {
    const callMeta = new CallMeta(
      (target: any),
      args,
      node.loc,
      targetName,
      typeScope,
      inferenced,
      isFinal,
      argsLocations
    );
    while (currentScope.skipCalls !== false && currentScope !== moduleScope) {
      // $FlowIssue
      currentScope = currentScope.parent;
    }
    currentScope.calls.push(callMeta);
  }
  const invocationType = result instanceof VariableInfo ? result.type : result;
  if (
    currentScope === moduleScope &&
    invocationType.parent.priority > TypeScope.MODULE_SCOPE_PRIORITY
  ) {
    const getArgumentTypeName = (arg) =>
      String((arg instanceof VariableInfo ? arg.type : arg).name);
    throw new HegelError(
      `Could not deduce type "${String(
        invocationType.name
      )}" arising from the arguments${args.length > 0 ? " " : ""}${args
        .map(getArgumentTypeName)
        .toString()}.
Please, provide type parameters for the call or provide default type value for parameters
of "${String(targetType.name)}" function.`,
      node.loc
    );
  }
  return { result, inferenced };
}

function invoke({
  parentNode,
  typeScope,
  moduleScope,
  pre,
  middle,
  post,
  target,
  targetType,
  genericArguments,
  args,
  node,
  meta,
  dropUnknown,
}) {
  if (targetType instanceof $AppliedImmutable) {
    targetType = targetType.readonly;
  }
  if (
    !(targetType instanceof $BottomType) &&
    !(targetType instanceof TypeVar && !targetType.isUserDefined) &&
    !(targetType instanceof FunctionType) &&
    !(
      targetType instanceof GenericType &&
      targetType.subordinateType instanceof FunctionType
    )
  ) {
    throw new HegelError("The target is not callable type.", node.loc);
  }
  try {
    const invocationType = getInvocationType(
      targetType,
      args,
      genericArguments,
      typeScope,
      node.loc,
      meta.isForAssign,
      dropUnknown
    );
    if (!(invocationType instanceof Type)) {
      return {
        result: addPropertyToThis(
          invocationType,
          parentNode,
          typeScope,
          moduleScope,
          pre,
          middle,
          post
        ),
        inferenced: false,
      };
    }
    if (
      targetType instanceof TypeVar &&
      !targetType.isUserDefined &&
      target instanceof VariableInfo
    ) {
      let func = findNearestScopeByType(
        VariableScope.FUNCTION_TYPE,
        // $FlowIssue
        target.parent
      );
      if (
        func.declaration &&
        func.declaration.type instanceof GenericType &&
        invocationType instanceof TypeVar
      ) {
        const genericArguments = func.declaration.type.genericArguments;
        genericArguments.push(invocationType);
        const fn = Type.getTypeRoot(targetType);
        fn.argumentsTypes.forEach((arg) => {
          if (
            arg instanceof TypeVar &&
            !arg.isUserDefined &&
            !genericArguments.includes(arg)
          ) {
            genericArguments.push(arg);
          }
        });
      }
    }
    return {
      result: invocationType,
      inferenced:
        isInferencedTypeVar(targetType) &&
        isInferencedTypeVar(invocationType, true),
    };
  } catch (e) {
    if (e.loc === undefined) {
      e.loc = node.loc;
    }
    throw e;
  }
}

function isInferencedTypeVar(t: Type, withoutRoot: boolean = false) {
  return (
    t instanceof TypeVar &&
    !t.isUserDefined &&
    (!withoutRoot || t.root === undefined)
  );
}

export function addPropertyToThis(
  currentNode: ClassProperty | ObjectProperty | ClassMethod | ObjectMethod,
  parentNode: Node,
  typeScope: TypeScope,
  moduleScope: ModuleScope | PositionedModuleScope,
  precompute: Handler,
  middlecompute: Handler,
  postcompute: Handler
) {
  // $FlowIssue
  const currentScope: VariableScope = getParentForNode(
    currentNode,
    parentNode,
    moduleScope
  );
  const propertyName = getPropertyName(currentNode, (node) =>
    addCallToTypeGraph(
      node,
      moduleScope,
      currentScope,
      parentNode,
      precompute,
      middlecompute,
      postcompute,
      { skipAddingCalls: true }
    )
  );
  const currentClassScope: any = findNearestScopeByType(
    [VariableScope.CLASS_TYPE, VariableScope.OBJECT_TYPE],
    currentScope
  );
  // $FlowIssue
  const self: VariableInfo = currentNode.static
    ? currentClassScope.declaration
    : currentClassScope.findVariable({ name: THIS_TYPE });
  const selfType =
    self.type instanceof $BottomType
      ? self.type.subordinateMagicType.subordinateType
      : self.type;
  if (currentClassScope.isProcessed) {
    // $FlowIssue
    return selfType.properties.get(propertyName).type;
  }
  const currentTypeScope =
    self.type instanceof $BottomType
      ? self.type.subordinateMagicType.localTypeScope
      : typeScope;
  let type = Type.Undefined;
  if (currentNode.typeAnnotation != null) {
    type = getTypeFromTypeAnnotation(
      currentNode.typeAnnotation,
      currentTypeScope,
      currentClassScope,
      false,
      null,
      parentNode,
      moduleScope,
      precompute,
      middlecompute,
      postcompute
    );
  }
  const property = new VariableInfo(
    type,
    currentClassScope,
    new Meta(currentNode.loc),
    false,
    false,
    currentNode.type === NODE.CLASS_PRIVATE_METHOD ||
      currentNode.type === NODE.CLASS_PRIVATE_PROPERTY
  );
  if (!(selfType instanceof ObjectType)) {
    throw new Error("Never!!!");
  }
  if (currentNode.hasInitializer || currentNode.type === NODE.OBJECT_PROPERTY) {
    property.hasInitializer = true;
  }
  selfType.properties.set(propertyName, property);
  if (moduleScope instanceof PositionedModuleScope) {
    moduleScope.addPosition(currentNode.key, property);
  }
  if (
    currentNode.type === NODE.OBJECT_METHOD ||
    currentNode.type === NODE.CLASS_METHOD
  ) {
    const fn = VariableScope.addAndTraverseNodeWithType(
      null,
      currentNode,
      parentNode,
      moduleScope,
      precompute,
      middlecompute,
      postcompute
    );
    property.hasInitializer = true;
    if (fn === undefined) {
      throw new Error("Never!!!");
    }
    property.type = fn.type;
  } else if (currentNode.value != null) {
    const inferenced = addCallToTypeGraph(
      currentNode,
      moduleScope,
      currentClassScope,
      parentNode,
      precompute,
      middlecompute,
      postcompute
    ).result;
    property.hasInitializer = true;
    if (currentNode.typeAnnotation === undefined) {
      property.type =
        inferenced instanceof VariableInfo ? inferenced.type : inferenced;
    }
  }
  if (moduleScope instanceof PositionedModuleScope) {
    moduleScope.addPosition(currentNode, property);
  }
  return property.type;
}

export function addMethodToThis(
  currentNode: Node,
  parentNode: Node,
  moduleScope: ModuleScope,
  pre: Handler,
  middle: Handler,
  post: Handler,
  isTypeDefinitions: boolean
) {
  const currentScope = moduleScope.scopes.get(
    VariableScope.getName(parentNode)
  );
  if (currentScope === undefined) {
    throw new Error("Never!!!");
  }
  const classScope: any = findNearestScopeByType(
    [VariableScope.CLASS_TYPE, VariableScope.OBJECT_TYPE],
    currentScope
  );
  if (classScope.isProcessed) {
    return;
  }
  const propertyName = getPropertyName(currentNode, (node) =>
    addCallToTypeGraph(
      node,
      moduleScope,
      currentScope,
      parentNode,
      pre,
      middle,
      post,
      { skipAddingCalls: true }
    )
  );
  const isPrivate = currentNode.type === NODE.CLASS_PRIVATE_METHOD;
  const self = classScope.findVariable({ name: THIS_TYPE });
  // $FlowIssue
  const classVar: VariableInfo =
    currentNode.static || propertyName === CONSTRUCTABLE
      ? classScope.declaration
      : self;
  const classType =
    classVar.type instanceof $BottomType
      ? classVar.type.subordinateMagicType.subordinateType
      : classVar.type;
  const methodScope = moduleScope.scopes.get(
    VariableScope.getName(currentNode)
  );
  if (methodScope !== undefined && !isTypeDefinitions) {
    return false;
  }
  // $FlowIssue
  const existedProperty = classType.properties.get(propertyName);
  const expectedType =
    existedProperty instanceof VariableInfo ? existedProperty.type : undefined;
  currentNode.expected = currentNode.expected || expectedType;
  let fn: VariableInfo | VariableInfo = addFunctionToTypeGraph(
    currentNode,
    parentNode,
    moduleScope,
    pre,
    middle,
    post,
    isTypeDefinitions
  );
  if (isPrivate) {
    fn = new VariableInfo/*:: <any> */(
      fn.type,
      fn.parent,
      fn.meta,
      fn.isConstant,
      fn.isInferenced,
      true
    );
  }
  fn.hasInitializer = true;
  if (!isTypeDefinitions && classScope.type === VariableScope.CLASS_TYPE) {
    const fnScope = moduleScope.scopes.get(VariableScope.getName(currentNode));
    if (fnScope === undefined) {
      throw new Error("Never!!!");
    }
    fnScope.declaration = fn;
    // $FlowIssue
    fnScope.body.set(
      THIS_TYPE,
      currentNode.static ? classScope.declaration : self
    );
    if (
      classScope.declaration.type.isSubtypeOf !== ObjectType.Object &&
      currentNode.static
    ) {
      // $FlowIssue
      fnScope.body.set(
        "super",
        new VariableInfo(classScope.declaration.type.isSubtypeOf, fnScope)
      );
    }
  }
  // $FlowIssue
  classType.properties.set(propertyName, fn);
  if (propertyName === CONSTRUCTABLE) {
    const type: FunctionType =
      // For Function Variable Scope type can't be an ObjectType
      fn.type instanceof GenericType ? fn.type.subordinateType : (fn.type: any);
    const returnType =
      (type.returnType instanceof ObjectType ||
        type.returnType instanceof CollectionType) &&
      ObjectType.Object.isPrincipalTypeFor(type.returnType)
        ? type.returnType
        : self.type;
    const fnName = `${String(self.type.name)} constructor`;
    let constructorType = FunctionType.term(
      fnName,
      {},
      type.argumentsTypes,
      returnType
    );
    if (self.type instanceof $BottomType) {
      const fnType = fn.type;
      const additionalArray =
        fnType instanceof GenericType
          ? fnType.genericArguments.filter(
              (a) => a !== fnType.subordinateType.returnType
            )
          : [];
      const genericArguments = Array.from(
        new Set([...self.type.genericArguments, ...additionalArray])
      );
      const localTypeScope =
        fn.type instanceof GenericType
          ? fn.type.localTypeScope
          : self.type.subordinateMagicType.localTypeScope;
      constructorType = GenericType.new(
        fnName,
        {},
        genericArguments,
        localTypeScope,
        constructorType
      );
    } else if (fn.type instanceof GenericType) {
      constructorType = GenericType.new(
        fnName,
        {},
        fn.type.genericArguments,
        fn.type.localTypeScope,
        constructorType
      );
    }
    fn.type = constructorType;
  }
  if (moduleScope instanceof PositionedModuleScope) {
    // $FlowIssue In Flow VariableInfo<ObjectType> is incompatible with VariableInfo<Type> even if you don't mutate argument
    moduleScope.addPosition(currentNode, fn);
  }
}
