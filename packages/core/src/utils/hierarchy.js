import { Type } from "../type-graph/types/type";
import { TypeVar } from "../type-graph/types/type-var";
import { TypeScope } from "../type-graph/type-scope";
import { TupleType } from "../type-graph/types/tuple-type";
import { ObjectType } from "../type-graph/types/object-type";
import { GenericType } from "../type-graph/types/generic-type";
import { FunctionType } from "../type-graph/types/function-type";

export function setupBaseHierarchy(globalTypeScope) {
  Type.GlobalTypeScope = globalTypeScope;
  Type.Undefined =
    globalTypeScope.body.get("undefined") || Type.new("undefined");
  Type.Null = globalTypeScope.body.get(null) || Type.new(null);
  Type.String = globalTypeScope.body.get("string") || Type.new("string");
  Type.Symbol = globalTypeScope.body.get("symbol") || Type.new("symbol");
  Type.Boolean = globalTypeScope.body.get("boolean") || Type.new("boolean");
  Type.Number = globalTypeScope.body.get("number") || Type.new("number");
  Type.BigInt = globalTypeScope.body.get("bigint") || Type.new("bigint");
  Type.Unknown = globalTypeScope.body.get("unknown") || Type.new("unknown");
  Type.Never = globalTypeScope.body.get("never") || Type.new("never");
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
