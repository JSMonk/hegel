import { Type } from "../type-graph/types/type";
import { TypeVar } from "../type-graph/types/type-var";
import { TypeScope } from "../type-graph/type-scope";
import { TupleType } from "../type-graph/types/tuple-type";
import { ObjectType } from "../type-graph/types/object-type";
import { GenericType } from "../type-graph/types/generic-type";
import { FunctionType } from "../type-graph/types/function-type";

export function setupBaseHierarchy(globalTypeScope) {
  Type.GlobalTypeScope = globalTypeScope;
  Type.Undefined.parent = globalTypeScope
  Type.Null.parent = globalTypeScope;
  Type.String.parent = globalTypeScope;
  Type.Symbol.parent = globalTypeScope;
  Type.Boolean.parent = globalTypeScope;
  Type.Number.parent = globalTypeScope;
  Type.BigInt.parent = globalTypeScope;
  Type.Unknown.parent = globalTypeScope;
  Type.Never.parent = globalTypeScope;
  ObjectType.Object.parent = globalTypeScope;
  FunctionType.Function.parent = globalTypeScope;
  TupleType.Array.parent = globalTypeScope;
  TypeVar.Self.parent = globalTypeScope;
}

export function setupFullHierarchy(globalTypeScope) {
  ObjectType.Object.root =
    globalTypeScope.body.get("Object") || ObjectType.new("Object", {}, []);
  FunctionType.Function.root =
    globalTypeScope.body.get("Function") || ObjectType.new("Function", {}, []);
  const local = new TypeScope(globalTypeScope);
  TupleType.Array.root =
    globalTypeScope.body.get("Array") ||
    GenericType.new(
      "Array",
      {},
      [TypeVar.new("T", { parent: local })],
      local,
      ObjectType.new("Array<T>", { parent: local }, [])
    );
}
