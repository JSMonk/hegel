// @flow
import type { SourceLocation } from "@babel/parser";

const ZeroLocation: SourceLocation = {
  start: { column: -1, line: -1 },
  end: { column: -1, line: -1 }
};

export class Meta {
  loc: SourceLocation;
  changed: boolean = false;
  isAnonymous: boolean = false;

  constructor(loc: SourceLocation = ZeroLocation) {
    this.loc = loc;
  }
}
