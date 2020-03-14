# Hegel

Hegel is a static type checker for JavaScript with strong typings, high inference level and a lot of additional goodies.
To read more about Hegel, check out [URL WILL BE ADDED SOON].

The main features:

1. Soundness

```typescript
const numbers: Array<number> = [];
// Error: Type "Array<number>" is incompatible with type "Array<number | string>"
const numbersOrStrings: Array<string | number> = numbers;
// Error: Property "toLocaleString" does not exist in "Number | undefined"
const localeString = numbers[1].toLocaleString();
```

2. Strong Type System

```typescript
function provideNumber(providedData: ?number) {
  // Error: Type "number | undefined" is incompatible with type "boolean"
  if (!providedData) {
    // Oops you lost "0"
    throw new TypeError("Number was not provided");
  }
  return providedData;
}
```

3. High level type Inference

```typescript
// Inferenced as "<_q, _c>((_c) => _q) => (_c) => Promise<_q>"
const promisify = fn => arg => Promise.resolve(fn(arg));
// Inferenced as "<_c>(_c) => Promise<_c>"
const id = promisify(x => x);
// Inferenced as "Promise<string>"
const upperStr = id("It will be inferenced").then(str => str.toUpperCase());
// Inferenced as "Promise<number>"
const twicedNum = id(42).then(num => num ** 2);
```

4. Typed Errors

```typescript
// Inferenced type "(unknown) => undefined throws TypeError"
function assertNumber(arg) {
  if (typeof arg !== "number") {
    throw new TypeError("Given arg is not a number");
  }
}
// Inferenced type "(unknown) => undefined throws ReferenceError | TypeError"
function assertField(obj) {
  if (typeof obj === "object" && obj !== null && "value" in obj) {
    assertNumber(obj.value)
  }
  throw new ReferenceError('"value" property doesn\'t exist');
}
try {
  assertField({});
} catch(error) {
  // error type is "ReferenceError | TypeError | unknown"
}
```

## Installation

You can install Hegel CLI using npm or yarn:

```bash
$ npm install -g @hegel/cli
# or
$ yarn global add @hegel/cli
```

Or install localy only for your project:

```bash
$ npm install -D @hegel/cli
# or
$ yarn add -D @hegel/cli
```

> Hegel was developed for current LTS version of [Node.js (12.16.1)](https://nodejs.org/en/). So, you need to have at least 12 version.

## Project Overview

There are few separated packages in Hegel project: 

- The main logic of analysis is placed in [@hegel/core](https://github.com/JSMonk/hegel/tree/master/packages/core)
- CLI interfaces is placed in [@hegel/cli](https://github.com/JSMonk/hegel/tree/master/packages/cli)
- The main typings (typings for browser or node.js environment and for default global environment) are placed in [@hegel/typings](https://github.com/JSMonk/hegel/tree/master/packages/typings)
- Language Server (which currently work with VS Code) is placed in [@hegel/language-server](https://github.com/JSMonk/hegel/tree/master/packages/language-server)
- Documentation is placed in [@hegel/docs](https://github.com/JSMonk/hegel/tree/master/packages/docs)

## Building Hegel from source

Hegel is written in JavaScript (Node.js 12 is required). Ensure that you have [Git](https://git-scm.com/downloads) and [Node.js 12](https://nodejs.org/en/) installed.

1. Clone the repo:

```sh
$ git clone git@github.com:JSMonk/hegel.git
```

2. Change to the @hegel/cli directory:

```sh
$ cd hegel/packages/cli
```

3. Install dependencies

```sh
$ npm i
```

4. That's all. You can build @hegel/cli:
```sh
npm run build
```
The result code will be compiled into build directory.
And you can debug it with default Node.js debugger:

```sh
node --inspect-brk ./build/index.js
```

## Tests

Currently all tests are written for [@hegel/core](https://github.com/JSMonk/hegel/tree/master/packages/core), so, if you will change code inside [@hegel/core](https://github.com/JSMonk/hegel/tree/master/packages/core) package, you can run tests by:

```sh
npm run test
```
 
## License

Hegel is MIT-licensed ([LICENSE](https://github.com/JSMonk/hegel/blob/master/LICENSE)). 
