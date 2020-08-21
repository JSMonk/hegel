// @flow
import type { Sourcable, Locationable } from "./errors";
import type { Program, CommentLine, SourceLocation } from "@babel/parser";

const IGNORE_COMMENT = "@hegel-issue";

export class IgnorableArray<T: Locationable & Sourcable> extends Array<T> {
  static withIgnoring<T: Locationable & Sourcable>(
    comments: Array<CommentLine>,
    path: string
  ): IgnorableArray<T> {
    const ignored = new Set(
      comments
        .filter((comment) => comment.value.trim() === IGNORE_COMMENT)
        .map((comment) => comment.loc.end.line + 1)
    );
    return new IgnorableArray<T>(ignored, path);
  }

  _ignored: Set<number>;
  _path: string;

  constructor(ignored: Set<number>, path: string) {
    super();
    this._ignored = ignored;
    this._path = path;
  }

  push(...elements: T[]) {
    elements.forEach((element) => {
      if (
        element.loc === undefined ||
        !this._ignored.has(element.loc.start.line)
      ) {
        element.source = this._path;
        super.push(element);
      }
    });
    // It's needed for backward compatibility with Array
    return 0;
  }
}
