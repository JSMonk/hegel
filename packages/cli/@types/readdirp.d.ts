interface EntryInfo {
  path: string;
  fullPath: string;
  basename: string;
}

interface ReaddirpOptions {
  root?: string;
  fileFilter?: string | string[] | ((entry: EntryInfo) => boolean);
  directoryFilter?: string | string[] | ((entry: EntryInfo) => boolean);
  type?: 'files' | 'directories' | 'files_directories' | 'all';
  lstat?: boolean;
  depth?: number;
  alwaysStat?: boolean;
}

interface Readdirp {
  promise(root: string, options?: ReaddirpOptions): Promise<EntryInfo[]>;
}

declare var readdirp: Readdirp;

export = readdirp;