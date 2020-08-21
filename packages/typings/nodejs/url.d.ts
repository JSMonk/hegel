import { ParsedUrlQuery, ParsedUrlQueryInput } from "querystring";

export interface UrlObject {
  auth?: string | null;
  hash?: string | null;
  host?: string | null;
  hostname?: string | null;
  href?: string | null;
  path?: string | null;
  pathname?: string | null;
  protocol?: string | null;
  search?: string | null;
  slashes?: boolean | null;
  port?: string | number | null;
  query?: string | null | ParsedUrlQueryInput;
}

export interface Url {
  auth: string | null;
  hash: string | null;
  host: string | null;
  hostname: string | null;
  href: string;
  path: string | null;
  pathname: string | null;
  protocol: string | null;
  search: string | null;
  slashes: boolean | null;
  port: string | null;
  query: string | null | ParsedUrlQuery;
}

export interface UrlWithParsedQuery extends Url {
  query: ParsedUrlQuery;
}

export interface UrlWithStringQuery extends Url {
  query: string | null;
}

export interface URLFormatOptions {
  auth?: boolean;
  fragment?: boolean;
  search?: boolean;
  unicode?: boolean;
}

class URLSearchParams {
  //implements Iterable<[string, string]> {
  constructor(
    init?:
      | URLSearchParams
      | string
      | { [key: string]: string | string[] | undefined }
      | Iterable<[string, string]>
      | Array<[string, string]>
  );
  append(name: string, value: string): void;
  delete(name: string): void;
  entries(): IterableIterator<[string, string]>;
  forEach(
    callback: (value: string, name: string, searchParams: this) => void
  ): void;
  get(name: string): string | null;
  getAll(name: string): string[];
  has(name: string): boolean;
  keys(): IterableIterator<string>;
  set(name: string, value: string): void;
  sort(): void;
  toString(): string;
  values(): IterableIterator<string>;
  //    [Symbol.iterator](): IterableIterator<[string, string]>;
}

export class URL {
  constructor(input: string, base?: string | URL);
  hash: string;
  host: string;
  hostname: string;
  href: string;
  origin: string;
  password: string;
  pathname: string;
  port: string;
  protocol: string;
  search: string;
  searchParams: URLSearchParams;
  username: string;
  toString(): string;
  toJSON(): string;
}

interface UrlModule {
  URL: typeof URL;
  URLSearchParams: typeof URLSearchParams;
  parse(
    urlStr: string,
    parseQueryString: boolean | undefined,
    slashesDenoteHost?: boolean
  ): UrlWithStringQuery;
  //function parse(urlStr: string, parseQueryString: boolean, slashesDenoteHost?: boolean): Url;

  //function format(URL: URL, options?: URLFormatOptions): string;
  format(urlObject: UrlObject | string): string;
  resolve(from: string, to: string): string;

  domainToASCII(domain: string): string;
  domainToUnicode(domain: string): string;

  /**
   * This function ensures the correct decodings of percent-encoded characters as
   * well as ensuring a cross-platform valid absolute path string.
   * @param url The file URL string or URL object to convert to a path.
   */
  fileURLToPath(url: string | URL): string;

  /**
   * This function ensures that path is resolved absolutely, and that the URL
   * control characters are correctly encoded when converting into a File URL.
   * @param url The path to convert to a File URL.
   */
  pathToFileURL(url: string): URL;
}

declare var url: UrlModule;

export = url;
