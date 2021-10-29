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
  ObjectType.Iterable.parent = globalTypeScope;
  ObjectType.Iterator.parent = globalTypeScope;
  FunctionType.Function.parent = globalTypeScope;
  TupleType.ReadonlyArray.parent = globalTypeScope;
  CollectionType.Array.parent = globalTypeScope;
  TypeVar.Self.parent = globalTypeScope;
}

export function setupFullHierarchy(globalTypeScope) {
  defineOrFindObject(ObjectType, "Object", globalTypeScope);
  defineOrFindGeneric(ObjectType, "Iterable", globalTypeScope);
  defineOrFindGeneric(ObjectType, "Iterator", globalTypeScope);
  defineOrFindObject(FunctionType, "Function", globalTypeScope);
  defineOrFindGeneric(CollectionType, "Array", globalTypeScope);
  defineOrFindGeneric(TupleType, "ReadonlyArray", globalTypeScope);
  TupleType.ReadonlyArray.name = "$Immutable<Array<T>>";
  TupleType.ReadonlyArray.root.name = "$Immutable<Array<T>>";
  TupleType.ReadonlyArray.root.subordinateType.name = "$Immutable<Array<T>>";
  /*
    Extend interface "SymbolConstructor" defined in @hegel/typings/standard/index.d.ts:125
    with callable property <T extends string = "">(description?: T): Symbol<T> and
    "for" method  <T extends string>(T): Symbol<T>
  */

  $Symbol.defineSymbolConstructorMethods();
}

export function dropAllGlobals() {
  ObjectType.Object.root = undefined;
  ObjectType.Iterator.root = undefined;
  ObjectType.Iterable.root = undefined;
  FunctionType.Function.root = undefined;
  TupleType.ReadonlyArray.root = undefined;
  CollectionType.Array.root = undefined;
}

function defineOrFindObject(Class, name, scope) {
  const type = Class[name];
  type.root = ObjectType.term(name, {}, []);
  scope.body.set(name, type);
}

function defineOrFindGeneric(Class, name, scope) {
  const parent = new TypeScope(scope);
  const type = Class[name];
  type.root = GenericType.term(
    name,
    {},
    [TypeVar.new("T", { parent })],
    parent,
    ObjectType.new(`${name}<T>`, { parent }, [])
  );
}
