---
name: Architecture Overview
route: /docs/architecture-overview
menu: For Potential Contributors
---

# Architecture Overview
----------------

In this overview we will talk mostly about the Core of Hegel. It should help you to get a high-level understanding of the Hegel architecture.

Core is placed in [@hegel/core](https://github.com/JSMonk/hegel/tree/master/packages/core) and contains the main logic of type checking and type inference.
The main logic of Core: take [Abstract Syntax Tree]() and convert it into symbols table (inside Hegel it's called `moduleScope`) which contains information about variables, scopes, and types.

So, AST conversion starts from tree traverse which is placed in [`src/utils/traverse.js`](https://github.com/JSMonk/hegel/tree/master/packages/core/src/utils/traverse.js).
In traverse we have 3 steps:

#### **Precompute**
[The Precompute step](#precomute) is a step in `traverseTree` function inside [`src/utils/traverse.js`](https://github.com/JSMonk/hegel/tree/master/packages/core/src/utils/traverse.js) which process AST node before the node children was processed.

It's needed to add initial information about [variables](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/variable-info.js) and [scopes](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/variable-scope.js). Also, we use [Precompute](#precomute) for type refinement (which main logic is placed in [src/inference/refinement.js](https://github.com/JSMonk/hegel/tree/master/packages/core/src/inference/refinement.js)).

#### **Middlecompute**
The most simple type of computation. The step processes node children one-by-one without deep processing. It's needed because JavaScript contains hoisting. 

```javascript
const a = getA();

function getA() {
  return 1;
}
```

This step hoist Function Declarations and Interface Declarations (only inside `.d.ts` files) by adding raw nodes into symbols table (we will do lazy processing of the nodes if these nodes are used before own declaration or will process it (in [Precompute step](#precomute) ) when we find their declarations).

Also, it's used for fast adding class and object methods, because in JavaScript we can call a method in another method which currently are not be processed.

```javascript
class Main {
  constructor() {
    this.a = this.getA();
  }

  getA() {
    return 1;
  }
}
```

#### **Postcompute**

In oposite to [Precompute step](#precompute), [Postcompute step](#postcumpute) processes AST node after all node's children were processed. 
We use the step for [type inference](#type-inference) (which main logic is placed in [`src/inference` directory](https://github.com/JSMonk/hegel/tree/master/packages/core/src/inference/)) and collecting of [Calls Infromation](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/meta/call-meta.js). The [Calls Infromation](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/meta/call-meta.js) is used in [Checking Step](#checking-step)

### Type Inference

So, type inference logics for each literal are placed in (which main logic is placed in [`src/inference` directory](https://github.com/JSMonk/hegel/tree/master/packages/core/src/inference/)). For an expression in [`src/type-graph/call.js` file](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/call.js) which adds [Calls Infromation](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/meta/call-meta.js) ).

For literals, we have a really simple logic. For example, code for type inference of a simple type:

```typescript
switch (currentNode.type) {
  case NODE.NUMERIC_LITERAL:
    result = Type.term(currentNode.value, {
      isSubtypeOf: Type.Number
    });
    break;
  case NODE.BIGINT_LITERAL:
    result = Type.term(`${currentNode.value}n`, {
      isSubtypeOf: Type.BigInt
    });
    break;
  case NODE.TEMPLATE_LITERAL:
    result = Type.String;
    break;
  case NODE.STRING_LITERAL:
    result = Type.term(`'${currentNode.value}'`, {
      isSubtypeOf: Type.String
    });
    break;
  case NODE.BOOLEAN_LITERAL:
    result = Type.term(currentNode.value);
    break;
  case NODE.NULL_LITERAL:
    result = Type.Null;
    break;
  case NODE.REG_EXP_LITERAL:
    result = Type.find("RegExp");
    break;
```

The tricky moments start for [Function](#function-inference) and [Objects/Classes](#class-and-object-inference).

#### Function Inference

First of all, we try to collect any defined type for arguments or return type at [Precompute step](#precompute), if argument or function doesn't have a type annotation then we create [`TypeVar`](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/types/type-var.js) (this type represents generic variables), and add it to generic arguments list. The code is placed in [/src/inference/function-type.js](https://github.com/JSMonk/hegel/tree/master/packages/core/src/inference/function-type.js) in `inferenceFunctionLiteralType`.

After processing every child node, we will try to find the type of an argument or return type by [Call Information](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/meta/call-meta.js), which is taken from all child [VariableScopes](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/variable-scope.js) of the function scope.

Arguments Resolving Colde is placed in [/src/inference/function-type.js](https://github.com/JSMonk/hegel/tree/master/packages/core/src/inference/function-type.js) in `resolveOuterTypeVarsFromCall`.

#### Class and Object inference

From the other side, inference of class or object type, because we have `this` keyword in JavaScript. It means that when we try to use any property or method from other methods in object or class instance we should have access to all the object or class methods and properties wherever it's defined.

```typescript
const obj = {
  c: 4,
  a() {
    return this.b();
  },
  b() {
    return this.c;
  }
}
```


So, we need to add methods and properties lazily. First of all, we add all methods and properties raw nodes in object/class type (We make it in [Middlecompute step](#middlecompute)), and, if we try to access a property or method then we traverse saved node and infer the type of the method or property (We make it by [Scope](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/scope.js) static method `addAndTraverseNodeWithType`).

### Checking Step

This step is described in [/src/checking/index.js](https://github.com/JSMonk/hegel/tree/master/packages/core/src/checking/index.js) and only take all [Calls Information](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/meta/call-meta.js) from every defined [VariableScope](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/variable-scope.js) (this calls is stored in `calls` property of every instance of [VariableScope class](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/variable-scope.js)) and check that every defined argument [is a principal type for](#principal-type) given argument at the position.
`checkCalls` function in [/src/checking/index.js](https://github.com/JSMonk/hegel/tree/master/packages/core/src/checking/index.js). We call the function in [/src/type-graph/type-graph.js `createModuleScope` function](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/type-graph.js) )

### Types

All types in Hegel Core are defined in [/src/type-graph/types/](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/types/) and every type is a child for the base [Type class](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/types/type.js).

#### Principal Type

Principal type is a type which equals to current or will be a supertype of current. From early version of `isPrincipalTypeFor` function:

```typescript
isPrincipalTypeFor(type: Type) {
  return this.equalsTo(type) || this.isSuperTypeFor(type);
}
```

Each type defined own `equalsTo` and `isSuperTypeFor`. As example, [UnionType class](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/types/union-type.js) defined `isSuperTypeFor` as (simplified version without performance details):

```typescript
isSuperTypeFor(anotherType: Type): boolean {
  if (anotherType instanceof UnionType) {
    for (const variantType of anotherType.variants) {
      if (!this.variants.some(type => type.isPrincipalTypeFor(variantType))) {
        return false;
      }
    }
    return true;
  }
  return this.variants.some(type =>
    type.isPrincipalTypeFor(anotherType)
  );
}
```

#### $BottomType

One of the interesting architecture decisions is [`$BottomType`](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/types/bottom-type.js). This type behaves like a `Promise` in types world. It means that when we want to apply [GenericType](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/types/union-type.js) (which behaves like a function in types world) any [TypeVar](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/types/type-var.js) we can reduce the cost of [`changeAll` function](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/types/type.js) and instead of deep changing of generic arguments to another type variables, we can return [`$BottomType`](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/types/bottom-type.js) which say that we want to apply new type variables instead old ones, and if we will replace a new type variable to a specific type instead of one more call of `changeAll`, we only change new type variable to a specific type and that's all.

### Refinement

Another tricky and interesting moment in Hegel is type refinement. It's tricky because, for refinement variable (for example), we need to create a new `VariableScope` and add a refined type of the variable in the scope. For example the next code:

```typescript
const a: number | null = 14;
if (a !== null) {
  const b = a + 12;
}
```

After the decision that inside `if` scope the variable `a` will be `number` type (we decide it in the [/src/inference/equals-refinement.js](https://github.com/JSMonk/hegel/tree/master/packages/core/src/inference/equals-refinement.js) ), we will add into `if` scope variable `a` with new type `number` instead of `number | null` (check [/src/inference/refinement.js `refinement` function](https://github.com/JSMonk/hegel/tree/master/packages/core/src/inference/refinement.js) ).

But, sometimes we should save a previous type to stay sound. An example is objects.

```typescript
function assert(obj: { a: number | string }): { a: number } | undefined {
  if (typeof obj.a === "number") {
    // With defined algorithm "obj" should be { a: number }, but it's not
    return obj;
  }
}

const original: { a: number | string } = { a: 2 };
const refinement = assert(original); // { a: number }
original.a = "str";

if (refinement !== undefined) {
  // TypeError
  void refinement.a.toFixed(0);
}
```

So, to solve the problem we use [`$RefinementedType`](https://github.com/JSMonk/hegel/tree/master/packages/core/src/type-graph/types/refinemented-type.js), which saves an original type and refined type.

### P.S.

If you need more details in the overview then ask the questions in [Hegel Issues](https://github.com/JSMonk/hegel/issues), and we will add more information about the weird block or will answer the question in the issue.
