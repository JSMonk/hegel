import { Type } from "../type-graph/types/type";
import { $Symbol } from "../type-graph/types/symbol-literal-type";
import { TypeVar } from "../type-graph/types/type-var";
import { UnionType } from "../type-graph/types/union-type";
import { TypeScope } from "../type-graph/type-scope";
import { TupleType } from "../type-graph/types/tuple-type";
import { ObjectType } from "../type-graph/types/object-type";
import { GenericType } from "../type-graph/types/generic-type";
import { FunctionType } from "../type-graph/types/function-type";
import { CollectionType } from "../type-graph/types/collection-type";

export function setupBaseHierarchy(globalTypeScope) {
  Type.GlobalTypeScope = globalTypeScope;
  Type.Undefined.parent = globalTypeScope;
  Type.Null.parent = globalTypeScope;
  Type.String.parent = globalTypeScope;
  Type.Symbol.parent = globalTypeScope;
  Type.True.parent = globalTypeScope;
  Type.False.parent = globalTypeScope;
  UnionType.Boolean.parent = globalTypeScope;
  Type.Number.parent = globalTypeScope;
  Type.BigInt.parent = globalTypeScope;
  Type.Unknown.parent = globalTypeScope;
  Type.Never.parent = globalTypeScope;
  ObjectType.Object.parent = globalTypeScope;
  FunctionType.Function.parent = globalTypeScope;
  TupleType.ReadonlyArray.parent = globalTypeScope;
  CollectionType.Array.parent = globalTypeScope;
  TypeVar.Self.parent = globalTypeScope;
}

export function setupFullHierarchy(globalTypeScope) {
  ObjectType.Object.root = ObjectType.term("Object", {}, []);
  globalTypeScope.body.set("Object", ObjectType.Object);
  FunctionType.Function.root = ObjectType.term("Function", {}, []);
  globalTypeScope.body.set("Function", FunctionType.Function);
  const readonlyArrayLocal = new TypeScope(globalTypeScope);
  TupleType.ReadonlyArray.root = GenericType.term(
    "ReadonlyArray",
    {},
    [TypeVar.new("T", { parent: readonlyArrayLocal })],
    readonlyArrayLocal,
    ObjectType.new("ReadonlyArray<T>", { parent: readonlyArrayLocal }, [])
  );
  TupleType.ReadonlyArray.name = "$Immutable<Array<T>>";
  TupleType.ReadonlyArray.root.name = "$Immutable<Array<T>>";
  TupleType.ReadonlyArray.root.subordinateType.name = "$Immutable<Array<T>>";
  const arrayLocal = new TypeScope(globalTypeScope);
  CollectionType.Array.root = GenericType.term(
    "Array",
    {},
    [TypeVar.new("T", { parent: arrayLocal })],
    arrayLocal,
    ObjectType.new("Array<T>", { parent: arrayLocal }, [])
  );
  /*
    Extend interface "SymbolConstructor" defined in @hegel/typings/standard/index.d.ts:125
    with callable property <T extends string = "">(description?: T): Symbol<T> and
    "for" method  <T extends string>(T): Symbol<T>
  */ 
  $Symbol.defineSymbolConstructorMethods();
}

export function dropAllGlobals() {
  ObjectType.Object.root = undefined;
  FunctionType.Function.root = undefined;
  TupleType.ReadonlyArray.root = undefined;
  CollectionType.Array.root = undefined;
}
