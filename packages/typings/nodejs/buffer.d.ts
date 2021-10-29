interface Buffer extends Uint8Array {
  readBigUInt64BE(offset?: number): bigint;
  readBigUInt64LE(offset?: number): bigint;
  readBigInt64BE(offset?: number): bigint;
  readBigInt64LE(offset?: number): bigint;
  writeBigInt64BE(value: bigint, offset?: number): number;
  writeBigInt64LE(value: bigint, offset?: number): number;
  writeBigUInt64BE(value: bigint, offset?: number): number;
  writeBigUInt64LE(value: bigint, offset?: number): number;
}

export const INSPECT_MAX_BYTES: number;
export const kMaxLength: number;
export const kStringMaxLength: number;
export const constants: {
  MAX_LENGTH: number;
  MAX_STRING_LENGTH: number;
};

export type TranscodeEncoding =
  | "ascii"
  | "utf8"
  | "utf16le"
  | "ucs2"
  | "latin1"
  | "binary";

export function transcode(
  source: Uint8Array,
  fromEnc: TranscodeEncoding,
  toEnc: TranscodeEncoding
): Buffer;

export const SlowBuffer: {
  /** @deprecated since v6.0.0, use Buffer.allocUnsafeSlow() */
  new (size: number): Buffer;
  prototype: Buffer;
};

export const Buffer: Buffer;
