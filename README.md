<p align="center">
  <a href="#" target="blank"><img src="./logo-dark.svg" width="300" alt="Hegel Logo" /></a>
</p>

---

[Getting Started](https://hegel.js.org/docs/install) |
[Documentation](https://hegel.js.org/docs/type-annotations) |
[Gitter Chat](https://gitter.im/hegel-js/community)

Hegel is a type checker for JavaScript with optional type annotations and preventing runtime type errors.

- **No Runtime Type Errors**. Hegel has a strong type system and soundness checks.
  This means that he finds any `TypeError` that may be thrown in runtime.
- **Optional Type Annotation**. Hegel has a high-level type inference which gives you the ability to drop a type annotation.
- **Typed Errors**. Hegel has a mechanism to inference and annotates which errors should be thrown by functions.
- **Using d.ts as libraries definitions**. Hegel has not a custom language for library typings description. We use a lot of existed `.d.ts` files as the source of typings for any libraries.
- **Only JavaScript with types**. Hegel has only type syntax, without any additional hard syntax sugar.

To read more about Hegel, check out [Docs](https://hegel.js.org/docs).

## Benefits over TypeScript

1. **No unexpected runtime errors**

TypeScript never will guarantee that you will not have a Type Error at Runtime. Check [TypeScript non-goals](https://github.com/microsoft/TypeScript/wiki/TypeScript-Design-Goals#non-goals)
point 3. Hegel is on the opposite side. We try to implement a strong and sound type system that will guarantee that your program is valid.

As example ([You can try it in our playground](https://hegel.js.org/try#MYewdgzgLgBGCuBbARgUwE4QFwwILvQEMBPAHgRQwD4YBeGAbQF0BuAKDYHpOYAJVAOaoANgFECIdDgAqxAA6oYAInxEyFNOipKYASwh6woRHMJRdyYYoDuuqAAsYUeYpUES5JJpgAfGNHRdMAFtNlBIWA0MCAB5dABlKEDg7Dx3MgCggV84L2o6XMpMdjYozDjE5IEIBgBGJgKlfmFhEAAaGFkFcXRJAEIlEu4+QREeyRwABV6FdGdlKBAAMV0AD1QAEx0NkFQDMBBYVFX9WCDlADk89Bz4MA3UADMgzZ1S65r6gDpFlfWNgAUtQAlCwgA)):

```typescript
const numbers: Array<number> = [];

// HegelError: Type "Array<number>" is incompatible with type "Array<number | string>"
const numbersOrStrings: Array<string | number> = numbers;

numbersOrStrings[1] = "Hello, TypeError!";

// HegelError: Property "toFixed" does not exist in "Number | undefined"
numbers[1].toFixed(1);
```

[The same example with TypeScript (v3.8.3)](https://www.typescriptlang.org/play/index.html?ssl=1&ssc=1&pln=6&pc=75#code/MYewdgzgLgBGCuBbARgUwE4QFwwILvQEMBPAHgRQwD4YBeGAbQF0BuAKAHoOYBRAkdDgAqxAA6oYAInxEyFNOiqSYASwiqwoRKMJQVyADYSA7iqgALGFDETpBEuSQKYAHxjR0KsAHMlbUJCw8hgQAPLoAMpQnj7YePZkHl7ernBO1HRplJjswZjhUTHeEAwAjEyZkgASqAYGIAA0MCLifOgCAISS7Fy8-IIwAArt4ujWUlAgAGIqAB6oACbKCyCo6mAgsKizarBeUgBy6eip8GALqABmXovKbHkl5QB0kzPzCwAUpQCULEA)
compiles without any error, but you will have 2 `TypeError` in runtime.

2. **Ability to skip type annotation**

Hegel is targeting at really powerful type inference which gives an ability to write fewer type annotations.

As example ([You can try it in our playground](https://hegel.js.org/try#MYewdgzgLgBADgJxAWwJYVQMwJ4wLwyZj4B8MAhggOakwAKSaEApgHQLMQgA2AbswAoiAylQCUYgNwAoUJFioAJvniN0WbAIAetLVOkB6AzACCYZQCIArnDjMEAZSgILMAO6pu3GACNmMVDBMew5lcggYCwYUdGYAHmgEQKoSC1lwaBgbO0dnFSUBCwBJWA8vX39A4IRQizFWKAALZjABRNpEhpAAVVt7AGFwwQlJIA)):

```javascript
const promisify = (fn) => (arg) => Promise.resolve(fn(arg));

const id = promisify((x) => x);

// And "upperStr" will be inferred as "Promise<string>"
const upperStr = id("It will be inferred").then((str) => str.toUpperCase());
```

[The same example with TypeScript (v3.8.3)](https://www.typescriptlang.org/play/index.html?ssl=6&ssc=75&pln=6&pc=45#code/PTAEAkFMHNIG1AdwJZwcgdgM0gJ1AEQAOuA9gLbIDOyWAngaAIZWEA8A+gI4A0oHAYwB8AChGCAlKAC8Q-lymzQ4gYrkAFMpSqROXIQQBQA0hioAXUCQrVadGaCwYZcprmgvQmmzoB0uSCpSOAA3SBEnETdoCQkAbkMQUAAVAAs8SD4oWAQUNFBMHHwCTmEVNS8tal1BA2NTCwKAEwdrbTsRAA9PTvjEsABBDBaCAFciIjwAZXNcRjyEACNIAuw8AJaWQm9tXQtcTGg6kzNLccncGfxpZpECAElLBdBl1aKNgglfc3SMEX3PPtvqQAKoTPAAYRY4VicSAA)
will throw 2 errors and inference `upperStr` as `Promise<any>`.

3. **Typed Errors**

Hegel gives you information about errors that may be thrown by functions/methods.

[Example of error type inference](https://hegel.js.org/try#GYVwdgxgLglg9mABAQwM6oKYCcoAU6oywBuGAciALYBG2AFMcgDYgYCUiA3gFCJ+IxgiOlACeABwxwhjFhkQBCALxLEAIjBVaWNRx78DiKAAsscAO6IwGSwBUJGAKJYzWOmoDiMUkmRYA5lQYYFACqFZwochWWtgKugDcvPwAvsl8gsKyrIgAPIgADHrphiZmltaWAErIYP5OLnBunt7BMTTYYRFRiOIERK3t2vFsSQZpKUA)

```javascript
// If you hover at function name you will see it type as "(unknown) => undefined throws RangeError | TypeError"
function assertPositiveNumber(value) {
  if (typeof value !== "number") {
    throw new TypeError("Given argument is not a number!");
  }
  if (value < 0) {
    throw new RangeError("Given number is not a positive number!");
  }
}
```

As you understand, you will have the same error type in `try-catch` block.
[Example](https://hegel.js.org/try#GYVwdgxgLglg9mABAQwM6oKYCcoAU6oywBuGAciALYBG2AFMcgDYgYCUiA3gFCJ+IxgiOlACeABwxwhjFhkQBCALxLEAIjBVaWNRx78DiKAAsscAO6IwGSwBUJGAKJYzWOmoDiMUkmRYA5lQYYFACqFZwochWWtgKugDcvPwAvsl8gsKyrIgAPIgADHrphiZmltaWAErIYP5OLnBunt7BMTTYYRFRiOIERK3t2vFsSQZpadxQWKJcJWiYOPiEJOSxbgAso9wpiBDIUBDGdOxzBgD054gAEhj1TAJgwNjBEPIABhjvRg4o4Wo1OoNVyIAA+iHskmcIPB4AA1mALGA1DsgA):

```javascript
try {
  assertPositiveNumber(4);
} catch (e) {
  // Hegel inference `e` type as "RangeError | TypeError | unknown"
}
```

[The same example with TypeScript (v3.8.3)](https://www.typescriptlang.org/play/index.html#code/GYVwdgxgLglg9mABAQwM6oKYCcoAU6oywBuGAciALYBG2AFMcgDYgYCUiA3gFCJ+IxgiOlACeABwxwhjFhkQBCALxLEAIjBVaWNRx78DiKAAsscAO6IwGSwBUJGAKJYzWOmoDiMUkmRYA5lQYYFACqFZwochWWtgKugDcvPwAvsl8gsKyrIgAPIgADHrphiZmltaWAErIYP5OLnBunt7BMTTYYRFRiOIERK3t2vFsSQZpadxQWKJcJWiYOPiEJOSxbgAso9wpiBDIUBDGdOxzBgD054gAEhj1TAJgwNjBEPIABhjvRg4o4Wq1URqHZAA)
will throw one error and `e` type will be `any`.

## Benefits over Flow

1. **No custom library definition language**

Flow.js has custom library definition languages and doesn't support the most popular TypeScript "d.ts" format. But for Hegel TypeScript "d.ts" it the only way to create type definition for library. So, every library which has TypeScript definitions should work with Hegel.

2. **Better type inference**

Hegel inferences function type by function declaration when Flow inferences function type by usage.
As example ([You can try it in our playground](https://hegel.js.org/try#MYewdgzgLgBAlgExgXhgDxQPnQbgFAD0BMAKgJ4AOApjCAGYwBEYArgLaMwBuAhgE5weAIwA2NOBCas2Qqn0Z4xsaSngIAFABYAlPiKlKNek2jzu-QaPGTGpuGADmCpTFOrE6xpsa68QA)):

```javascript
const id = (x) => x;
// Hegel inference type of "num" variable is "number"
let num = id(4);
// And type of "str" as "string"
let str = id("4");
```

[The same example with Flow (v0.123.0)](https://flow.org/try/#0PQKgBAAgZgNg9gdzCYAoVBjOA7AzgFzAEsATMAXjAA8KA+agblWGDABUBPABwFMw4oYAETYArgFshYAG4BDAE5FZAIxh8iuYWPHKe8oajWFtFYiQAUAFgCUTFu258BwgvpkKlq9ZqGui2AHMDIzBXU1JzIUshW1QgA)
will inference both `num` and `str` as `number | string`.

3. **Typed Errors**

Hegel gives you information about errors that may be thrown by functions/methods.

[Example of error type inference](https://hegel.js.org/try#GYVwdgxgLglg9mABAQwM6oKYCcoAU6oywBuGAciALYBG2AFMcgDYgYCUiA3gFCJ+IxgiOlACeABwxwhjFhkQBCALxLEAIjBVaWNRx78DiKAAsscAO6IwGSwBUJGAKJYzWOmoDiMUkmRYA5lQYYFACqFZwochWWtgKugDcvPwAvsl8gsKyrIgAPIgADHrphiZmltaWAErIYP5OLnBunt7BMTTYYRFRiOIERK3t2vFsSQZpKUA)

```javascript
// If you hover at function name you will see it type as "(unknown) => undefined throws RangeError | TypeError"
function assertPositiveNumber(value) {
  if (typeof value !== "number") {
    throw new TypeError("Given argument is not a number!");
  }
  if (value < 0) {
    throw new RangeError("Given number is not a positive number!");
  }
}
```

As you understand, you will have the same error type in `try-catch` block.
[Example](https://hegel.js.org/try#GYVwdgxgLglg9mABAQwM6oKYCcoAU6oywBuGAciALYBG2AFMcgDYgYCUiA3gFCJ+IxgiOlACeABwxwhjFhkQBCALxLEAIjBVaWNRx78DiKAAsscAO6IwGSwBUJGAKJYzWOmoDiMUkmRYA5lQYYFACqFZwochWWtgKugDcvPwAvsl8gsKyrIgAPIgADHrphiZmltaWAErIYP5OLnBunt7BMTTYYRFRiOIERK3t2vFsSQZpadxQWKJcJWiYOPiEJOSxbgAso9wpiBDIUBDGdOxzBgD054gAEhj1TAJgwNjBEPIABhjvRg4o4Wo1OoNVyIAA+iHskmcIPB4AA1mALGA1DsgA):

```javascript
try {
  assertPositiveNumber(4);
} catch (e) {
  // Hegel inference `e` type as "RangeError | TypeError | unknown"
}
```

[The same example with Flow (v0.123.0)](https://flow.org/try/#0PQKgBAAgZgNg9gdzCYAoVUCuA7AxgFwEs5swBDAZwoFMAnfABTgsKIDdqA5TAWwCM6ACjZkYmagEowAb1Rh5YQlDCD8ATwAO1OMpFjqYAIQBeY2ABE2XgNrmpshY7D4AFrURhs1JABVN1AFFad1pBcwBxQg5SMloAc15qbHxFCk84FLJPazpDOwBuOQUAXyL5JRU9cTAAHjAABnsyp1d3JC8kACUybDjA4LhQiKik7P46VPTMsA1mVhGxmzyJQsdS0tR8WjUZZsoaeiYWdi4c0IBaACYV1GKwXDJ8XBdBSV3HYGAwAAlqPphFNgoHQkrgDAADajg5z+chpczUHgadTmW5AA)
will inference `e` type as `empty`.

## Installing

**Step 1**: check your [Node.js](https://nodejs.org/en/) version:

```bash
$ node -v
v12.0.0
```

Hegel was developed for current LTS version of [Node.js (12.16.1)](https://nodejs.org/en/). So, you need to have at least 12 version.

If you have less than 12 version of [Node.js](https://nodejs.org/en/) you may change it to 12 or latest by [`nvm`](https://github.com/nvm-sh/nvm).

**Step 2**: install `@hegel/cli` with npm globally or locally:

```bash
# globally
$ npm install -g @hegel/cli

# locally
$ npm install -D @hegel/cli
```

**Step 3**. You already can use it into your JavaScript project:

```bash
# globally
$ hegel
No errors!

# locally
$ npx hegel
No errors!
```

> Hegel has a zero-configuration, but if you want to change settings see [Configuration Section](https://hegel.js.org/docs/configuration).

**Step 4**. Hegel is already configured, but, you need to compile your project to plain JavaScript.

- If you use [Babel](https://babeljs.io/):
  Add into `.babelrc` file (or create `.babelrc` file at the root of your project with) next content:

  ```json
  {
    "presets": [["@babel/preset-flow", { "all": true }]]
  }
  ```

  And install `@babel/preset-flow`

  ```bash
  $ npm i -D @babel/core @babel/cli @babel/preset-flow
  ```

  Add script inside your package.json:

  ```json
  {
    "name": "your-project",
    "scripts": {
      "build": "babel directory_with_your_project_files/ -d compilation_destination_directory/"
    }
  }
  ```

- If you don't use [Babel](https://babeljs.io/):
  The same as Flow, you can use [flow-remove-types](https://www.npmjs.com/package/flow-remove-types).

  Install `flow-remove-types`:

  ```bash
  $ npm i -D flow-remove-types
  ```

  And add next script inside your `package.json` `scripts` section:

  ```json
  {
    "scripts": {
      "build": "flow-remove-types directory_with_your_project_files/ --out-dir compilation_destination_directory/ --all"
    }
  }
  ```

**Finally**. You can compile your project by:

```bash
$ npm run build
```

## Project Overview

There are few separated packages in Hegel project:

- [@hegel/core](https://github.com/JSMonk/hegel/tree/master/packages/core): the main logic of analysis.
- [@hegel/cli](https://github.com/JSMonk/hegel/tree/master/packages/cli): CLI logic.
- [@hegel/typings](https://github.com/JSMonk/hegel/tree/master/packages/typings): typings for browser or node.js environment and for default global environment
- [@hegel/language-server](https://github.com/JSMonk/hegel/tree/master/packages/language-server): language Server (which currently work with VS Code)
- [@hegel/docs](https://github.com/JSMonk/hegel/tree/master/packages/docs): documentation

## Building Hegel from source

You will need to install [Git](https://git-scm.com/downloads), nodejs, npm and yarn

it is HIGHLY RECOMMENDED to install nodejs (and npm) with [nvm](https://github.com/creationix/nvm) and then yarn with npm like so `npm -g i yarn`

required versions of sayed software are listed below

```yaml
node: ^12.16.3
npm: ^6.14.4
yarn: ^1.22.4
```

Open Terminal and copy paste following commands

```sh
# clone the repo
git clone git@github.com:JSMonk/hegel.git

# cd into the repo
cd hegel

# install all dependencies
yarn

# build core and cli
yarn build
```

## Tests

Currently, all tests are written for [@hegel/core](https://github.com/JSMonk/hegel/tree/master/packages/core), so, if you will change code inside [@hegel/core](https://github.com/JSMonk/hegel/tree/master/packages/core) package, you can run tests by:

```sh
yarn test
```

## License

Hegel is MIT-licensed ([LICENSE](https://github.com/JSMonk/hegel/blob/master/LICENSE)).
