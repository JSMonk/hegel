// @flow
import type { Locationable } from "./errors";
import type { Program, CommentLine, SourceLocation } from "@babel/parser";

const IGNORE_COMMENT = "@hegel-issue";

export class IgnorableArray<T: Locationable> extends Array<T> {
  static withIgnoring<T: Locationable>(
    comments: Array<CommentLine>
  ): IgnorableArray<T> {
    const ignored = new Set(
      comments
        .filter(comment => comment.value.trim() === IGNORE_COMMENT)
        .map(comment => comment.loc.end.line + 1)
    );
    return new IgnorableArray<T>(ignored);
  }

  _ignored: Set<number>;

  constructor(ignored: Set<number>) {
    super();
    this._ignored = ignored;
  }

  push(...elements: T[]) {
    elements.forEach(element => {
      if (
        element.loc === undefined ||
        !this._ignored.has(element.loc.start.line)
      ) {
        super.push(element);
      }
    });
    // It's needed for backward compatibility with Array
    return 0;
  }
}
