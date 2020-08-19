export class AssertionError extends Error {
  name: string;
  message: string;
  actual: any;
  expected: any;
  operator: string;
  generatedMessage: boolean;
  code: "ERR_ASSERTION";

  constructor(options?: {
    message?: string;
    actual?: any;
    expected?: any;
    operator?: string;
    stackStartFn?: Function;
  });
}

export type AssertPredicate =
  | RegExp
  | (() => Object)
  | ((thrown: any) => boolean)
  | Object
  | Error;

interface Assert {
  (value: any, message?: string | Error): void;
  fail(message?: string | Error): never;
  ok(value: any, message?: string | Error): void;
  equal(actual: any, expected: any, message?: string | Error): void;
  notEqual(actual: any, expected: any, message?: string | Error): void;
  deepEqual(actual: any, expected: any, message?: string | Error): void;
  notDeepEqual(actual: any, expected: any, message?: string | Error): void;
  strictEqual(actual: any, expected: any, message?: string | Error): void;
  notStrictEqual(actual: any, expected: any, message?: string | Error): void;
  deepStrictEqual(actual: any, expected: any, message?: string | Error): void;
  notDeepStrictEqual(
    actual: any,
    expected: any,
    message?: string | Error
  ): void;
  throws(block: () => any, message?: string | Error): void;
  doesNotThrow(block: () => any, message?: string | Error): void;
  ifError(value: any): void;
  rejects(
    block: (() => Promise<any>) | Promise<any>,
    message?: string | Error
  ): Promise<void>;
  doesNotReject(
    block: (() => Promise<any>) | Promise<any>,
    message?: string | Error
  ): Promise<void>;

  strict(value: any, message?: string | Error): void;
  AssertionError: AssertionError;
}

declare var assert: Assert;

export = assert;
