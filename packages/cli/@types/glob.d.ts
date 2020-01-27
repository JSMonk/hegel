type GlobOptions = {
  cwd?: string;
  root?: string;
  dot?: boolean;
  nodir?: boolean;
  ignore?: string[];
};

interface Glob {
  sync(pattern: string, options?: GlobOptions): Array<string>;
}

declare var glob: Glob;

export = glob;
