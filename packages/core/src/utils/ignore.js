// @flow
import type { Program, CommentLine, SourceLocation } from "@babel/parser";

const IGNORE_COMMENT = "@hegel-issue";

export class IgnorableArray<T: { loc: SourceLocation }> extends Array<T> {

   static from(comments: Array<CommentLine>) {
     const ignored = new Set(
       comments
         .filter(comment => comment.value.trim() === IGNORE_COMMENT)
         .map(comment => comment.loc.end.line + 1)
    );
    return new IgnorableArray(ignored);
   }

  _ignored: Set<number>;

  constructor(ignored: Set<number>) {
    super();
    this._ignored = ignored; 
  }

  push(...elements: T[]) {
    elements.forEach(element => {
      if (element.loc === undefined || !this._ignored.has(element.loc.end.line)) {
        super.push(element);
      }
    });
  }
}
