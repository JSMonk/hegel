// @flow
import type { SourceLocation } from "@babel/parser";

export default class HegelError extends Error {
  loc: SourceLocation;
  source: string;

  constructor(message: string, loc: SourceLocation, source: string = "") {
    super(message);
    this.source = source;
    this.loc = loc && {
      end: loc.end,
      start: loc.start,
    };
  }
}

export class UnreachableError extends Error {
  loc: SourceLocation;

  constructor(loc: SourceLocation) {
    super("");
    this.loc = {
      end: loc.end,
      start: loc.start,
    };
  }
}
