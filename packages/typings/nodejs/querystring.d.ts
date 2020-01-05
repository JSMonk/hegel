export interface StringifyOptions {
    encodeURIComponent?: (str: string) => string;
}

export interface ParseOptions {
    maxKeys?: number;
    decodeURIComponent?: (str: string) => string;
}

export interface ParsedUrlQuery { [key: string]: string | string[]; }

export interface ParsedUrlQueryInput {
    [key: string]: string | number | boolean | string[] | number[] | boolean[] | undefined | null;
}

export function stringify(obj?: ParsedUrlQueryInput, sep?: string, eq?: string, options?: StringifyOptions): string;
export function parse(str: string, sep?: string, eq?: string, options?: ParseOptions): ParsedUrlQuery;
/**
 * The querystring.encode() function is an alias for querystring.stringify().
 */
export const encode: typeof stringify;
/**
 * The querystring.decode() function is an alias for querystring.parse().
 */
export const decode: typeof parse;
export function escape(str: string): string;
export function unescape(str: string): string;
