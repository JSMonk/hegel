//import * as stream from "stream";
//import * as events from "events";
import { URL } from "url";

/**
 * Valid types for path values in "fs".
 */
type PathLike = string | Buffer | URL;

type NoParamCallback = (err: ErrnoException | null) => void;

interface StatsBase<T> {
  isFile(): boolean;
  isDirectory(): boolean;
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isSymbolicLink(): boolean;
  isFIFO(): boolean;
  isSocket(): boolean;

  dev: number;
  ino: number;
  mode: number;
  nlink: number;
  uid: number;
  gid: number;
  rdev: number;
  size: number;
  blksize: number;
  blocks: number;
  atimeMs: number;
  mtimeMs: number;
  ctimeMs: number;
  birthtimeMs: number;
  atime: Date;
  mtime: Date;
  ctime: Date;
  birthtime: Date;
}

interface StatsInstance extends StatsBase<number> {}

class Stats {
  new(): StatsInstance;
}

class Dirent {
  isFile(): boolean;
  isDirectory(): boolean;
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isSymbolicLink(): boolean;
  isFIFO(): boolean;
  isSocket(): boolean;
  name: string;
}

/**
 * A class representing a directory stream.
 */
class Dir {
  readonly path: string;

  /**
   * Asynchronously iterates over the directory via `readdir(3)` until all entries have been read.
   */
  //[Symbol.asyncIterator](): AsyncIterableIterator<Dirent>;

  /**
   * Asynchronously close the directory's underlying resource handle.
   * Subsequent reads will result in errors.
   */
  close(): Promise<void>;
  // close(cb: NoParamCallback): void;

  /**
   * Synchronously close the directory's underlying resource handle.
   * Subsequent reads will result in errors.
   */
  closeSync(): void;

  /**
   * Asynchronously read the next directory entry via `readdir(3)` as an `Dirent`.
   * After the read is completed, a value is returned that will be resolved with an `Dirent`, or `null` if there are no more directory entries to read.
   * Directory entries returned by this function are in no particular order as provided by the operating system's underlying directory mechanisms.
   */
  read(): Promise<Dirent | null>;
  // read(cb: (err: ErrnoException | null, dirEnt: Dirent | null) => void): void;

  /**
   * Synchronously read the next directory entry via `readdir(3)` as a `Dirent`.
   * If there are no more directory entries to read, null will be returned.
   * Directory entries returned by this function are in no particular order as provided by the operating system's underlying directory mechanisms.
   */
  readSync(): Dirent;
}

export interface FSWatcher extends EventEmitter {
  close(): void;

  /**
   * events.EventEmitter
   *   1. change
   *   2. error
   */
  addListener(event: string, listener: (...args: any[]) => void): this;
  //    addListener(event: "change", listener: (eventType: string, filename: string | Buffer) => void): this;
  //    addListener(event: "error", listener: (error: Error) => void): this;
  //    addListener(event: "close", listener: () => void): this;

  on(event: string, listener: (...args: any[]) => void): this;
  //    on(event: "change", listener: (eventType: string, filename: string | Buffer) => void): this;
  //    on(event: "error", listener: (error: Error) => void): this;
  //    on(event: "close", listener: () => void): this;

  once(event: string, listener: (...args: any[]) => void): this;
  //    once(event: "change", listener: (eventType: string, filename: string | Buffer) => void): this;
  //    once(event: "error", listener: (error: Error) => void): this;
  //    once(event: "close", listener: () => void): this;

  prependListener(event: string, listener: (...args: any[]) => void): this;
  //    prependListener(event: "change", listener: (eventType: string, filename: string | Buffer) => void): this;
  //    prependListener(event: "error", listener: (error: Error) => void): this;
  //    prependListener(event: "close", listener: () => void): this;

  prependOnceListener(event: string, listener: (...args: any[]) => void): this;
  //    prependOnceListener(event: "change", listener: (eventType: string, filename: string | Buffer) => void): this;
  //    prependOnceListener(event: "error", listener: (error: Error) => void): this;
  //    prependOnceListener(event: "close", listener: () => void): this;
}

class ReadStream {
  //extends ReadableStream {
  close(): void;
  bytesRead: number;
  path: string | Buffer;

  /**
   * events.EventEmitter
   *   1. open
   *   2. close
   */
  addListener(event: string, listener: (...args: any[]) => void): this;
  addListener(event: "open", listener: (fd: number) => void): this;
  addListener(event: "close", listener: () => void): this;

  on(event: string, listener: (...args: any[]) => void): this;
  //    on(event: "open", listener: (fd: number) => void): this;
  //    on(event: "close", listener: () => void): this;

  once(event: string, listener: (...args: any[]) => void): this;
  //    once(event: "open", listener: (fd: number) => void): this;
  //    once(event: "close", listener: () => void): this;

  prependListener(event: string, listener: (...args: any[]) => void): this;
  //    prependListener(event: "open", listener: (fd: number) => void): this;
  //    prependListener(event: "close", listener: () => void): this;

  prependOnceListener(event: string, listener: (...args: any[]) => void): this;
  //    prependOnceListener(event: "open", listener: (fd: number) => void): this;
  //    prependOnceListener(event: "close", listener: () => void): this;
}

class WriteStream {
  //extends WritableStream {
  close(): void;
  bytesWritten: number;
  path: string | Buffer;

  /**
   * events.EventEmitter
   *   1. open
   *   2. close
   */
  addListener(event: string, listener: (...args: any[]) => void): this;
  //    addListener(event: "open", listener: (fd: number) => void): this;
  //    addListener(event: "close", listener: () => void): this;

  on(event: string, listener: (...args: any[]) => void): this;
  //    on(event: "open", listener: (fd: number) => void): this;
  //    on(event: "close", listener: () => void): this;

  once(event: string, listener: (...args: any[]) => void): this;
  //    once(event: "open", listener: (fd: number) => void): this;
  //    once(event: "close", listener: () => void): this;

  prependListener(event: string, listener: (...args: any[]) => void): this;
  //    prependListener(event: "open", listener: (fd: number) => void): this;
  //    prependListener(event: "close", listener: () => void): this;

  prependOnceListener(event: string, listener: (...args: any[]) => void): this;
  //    prependOnceListener(event: "open", listener: (fd: number) => void): this;
  //    prependOnceListener(event: "close", listener: () => void): this;
}
interface RmDirOptions {
  /**
   * If `true`, perform a recursive directory removal. In
   * recursive mode, errors are not reported if `path` does not exist, and
   * operations are retried on failure.
   * @experimental
   * @default false
   */
  recursive?: boolean;
}

interface RmDirAsyncOptions extends RmDirOptions {
  /**
   * If an `EMFILE` error is encountered, Node.js will
   * retry the operation with a linear backoff of 1ms longer on each try until the
   * timeout duration passes this limit. This option is ignored if the `recursive`
   * option is not `true`.
   * @default 1000
   */
  emfileWait?: number;
  /**
   * If an `EBUSY`, `ENOTEMPTY`, or `EPERM` error is
   * encountered, Node.js will retry the operation with a linear backoff wait of
   * 100ms longer on each try. This option represents the number of retries. This
   * option is ignored if the `recursive` option is not `true`.
   * @default 3
   */
  maxBusyTries?: number;
}

interface MakeDirectoryOptions {
  /**
   * Indicates whether parent folders should be created.
   * @default false
   */
  recursive?: boolean;
  /**
   * A file mode. If a string is passed, it is parsed as an octal integer. If not specified
   * @default 0o777.
   */
  mode?: number;
}

interface OpenDirOptions {
  encoding?: BufferEncoding;
}

interface WriteVResult {
  bytesWritten: number;
  buffers: ArrayBufferView[];
}

type WriteFileOptions =
  | { encoding?: string | null; mode?: number | string; flag?: string }
  | string
  | null;
interface Promises {
  //     interface FileHandle {
  //         /**
  //          * Gets the file descriptor for this file handle.
  //          */
  //         readonly fd: number;

  //         /**
  //          * Asynchronously append data to a file, creating the file if it does not exist. The underlying file will _not_ be closed automatically.
  //          * The `FileHandle` must have been opened for appending.
  //          * @param data The data to write. If something other than a `Buffer` or `Uint8Array` is provided, the value is coerced to a string.
  //          * @param options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
  //          * If `encoding` is not supplied, the default of `'utf8'` is used.
  //          * If `mode` is not supplied, the default of `0o666` is used.
  //          * If `mode` is a string, it is parsed as an octal integer.
  //          * If `flag` is not supplied, the default of `'a'` is used.
  //          */
  //         appendFile(data: any, options?: { encoding?: string | null, mode?: string | number, flag?: string | number } | string | null): Promise<void>;

  //         /**
  //          * Asynchronous fchown(2) - Change ownership of a file.
  //          */
  //         chown(uid: number, gid: number): Promise<void>;

  //         /**
  //          * Asynchronous fchmod(2) - Change permissions of a file.
  //          * @param mode A file mode. If a string is passed, it is parsed as an octal integer.
  //          */
  //         chmod(mode: string | number): Promise<void>;

  //         /**
  //          * Asynchronous fdatasync(2) - synchronize a file's in-core state with storage device.
  //          */
  //         datasync(): Promise<void>;

  //         /**
  //          * Asynchronous fsync(2) - synchronize a file's in-core state with the underlying storage device.
  //          */
  //         sync(): Promise<void>;

  //         /**
  //          * Asynchronously reads data from the file.
  //          * The `FileHandle` must have been opened for reading.
  //          * @param buffer The buffer that the data will be written to.
  //          * @param offset The offset in the buffer at which to start writing.
  //          * @param length The number of bytes to read.
  //          * @param position The offset from the beginning of the file from which data should be read. If `null`, data will be read from the current position.
  //          */
  //         read<TBuffer extends Uint8Array>(buffer: TBuffer, offset?: number | null, length?: number | null, position?: number | null): Promise<{ bytesRead: number, buffer: TBuffer }>;

  //         /**
  //          * Asynchronously reads the entire contents of a file. The underlying file will _not_ be closed automatically.
  //          * The `FileHandle` must have been opened for reading.
  //          * @param options An object that may contain an optional flag.
  //          * If a flag is not provided, it defaults to `'r'`.
  //          */
  //         readFile(options?: { encoding?: null, flag?: string | number } | null): Promise<Buffer>;

  //         /**
  //          * Asynchronously reads the entire contents of a file. The underlying file will _not_ be closed automatically.
  //          * The `FileHandle` must have been opened for reading.
  //          * @param options An object that may contain an optional flag.
  //          * If a flag is not provided, it defaults to `'r'`.
  //          */
  //         readFile(options: { encoding: BufferEncoding, flag?: string | number } | BufferEncoding): Promise<string>;

  //         /**
  //          * Asynchronously reads the entire contents of a file. The underlying file will _not_ be closed automatically.
  //          * The `FileHandle` must have been opened for reading.
  //          * @param options An object that may contain an optional flag.
  //          * If a flag is not provided, it defaults to `'r'`.
  //          */
  //         readFile(options?: { encoding?: string | null, flag?: string | number } | string | null): Promise<string | Buffer>;

  //         /**
  //          * Asynchronous fstat(2) - Get file status.
  //          */
  //         stat(): Promise<Stats>;

  //         /**
  //          * Asynchronous ftruncate(2) - Truncate a file to a specified length.
  //          * @param len If not specified, defaults to `0`.
  //          */
  //         truncate(len?: number): Promise<void>;

  //         /**
  //          * Asynchronously change file timestamps of the file.
  //          * @param atime The last access time. If a string is provided, it will be coerced to number.
  //          * @param mtime The last modified time. If a string is provided, it will be coerced to number.
  //          */
  //         utimes(atime: string | number | Date, mtime: string | number | Date): Promise<void>;

  //         /**
  //          * Asynchronously writes `buffer` to the file.
  //          * The `FileHandle` must have been opened for writing.
  //          * @param buffer The buffer that the data will be written to.
  //          * @param offset The part of the buffer to be written. If not supplied, defaults to `0`.
  //          * @param length The number of bytes to write. If not supplied, defaults to `buffer.length - offset`.
  //          * @param position The offset from the beginning of the file where this data should be written. If not supplied, defaults to the current position.
  //          */
  //         write<TBuffer extends Uint8Array>(buffer: TBuffer, offset?: number | null, length?: number | null, position?: number | null): Promise<{ bytesWritten: number, buffer: TBuffer }>;

  //         /**
  //          * Asynchronously writes `string` to the file.
  //          * The `FileHandle` must have been opened for writing.
  //          * It is unsafe to call `write()` multiple times on the same file without waiting for the `Promise`
  //          * to be resolved (or rejected). For this scenario, `fs.createWriteStream` is strongly recommended.
  //          * @param string A string to write. If something other than a string is supplied it will be coerced to a string.
  //          * @param position The offset from the beginning of the file where this data should be written. If not supplied, defaults to the current position.
  //          * @param encoding The expected string encoding.
  //          */
  //         write(data: any, position?: number | null, encoding?: string | null): Promise<{ bytesWritten: number, buffer: string }>;

  //         /**
  //          * Asynchronously writes data to a file, replacing the file if it already exists. The underlying file will _not_ be closed automatically.
  //          * The `FileHandle` must have been opened for writing.
  //          * It is unsafe to call `writeFile()` multiple times on the same file without waiting for the `Promise` to be resolved (or rejected).
  //          * @param data The data to write. If something other than a `Buffer` or `Uint8Array` is provided, the value is coerced to a string.
  //          * @param options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
  //          * If `encoding` is not supplied, the default of `'utf8'` is used.
  //          * If `mode` is not supplied, the default of `0o666` is used.
  //          * If `mode` is a string, it is parsed as an octal integer.
  //          * If `flag` is not supplied, the default of `'w'` is used.
  //          */
  //         writeFile(data: any, options?: { encoding?: string | null, mode?: string | number, flag?: string | number } | string | null): Promise<void>;

  //         /**
  //          * See `fs.writev` promisified version.
  //          */
  //         writev(buffers: ArrayBufferView[], position?: number): Promise<WriteVResult>;

  //         /**
  //          * Asynchronous close(2) - close a `FileHandle`.
  //          */
  //         close(): Promise<void>;
  //     }

  //     /**
  //      * Asynchronously tests a user's permissions for the file specified by path.
  //      * @param path A path to a file or directory. If a URL is provided, it must use the `file:` protocol.
  //      * URL support is _experimental_.
  //      */
  //     function access(path: PathLike, mode?: number): Promise<void>;

  //     /**
  //      * Asynchronously copies `src` to `dest`. By default, `dest` is overwritten if it already exists.
  //      * Node.js makes no guarantees about the atomicity of the copy operation.
  //      * If an error occurs after the destination file has been opened for writing, Node.js will attempt
  //      * to remove the destination.
  //      * @param src A path to the source file.
  //      * @param dest A path to the destination file.
  //      * @param flags An optional integer that specifies the behavior of the copy operation. The only
  //      * supported flag is `fs.constants.COPYFILE_EXCL`, which causes the copy operation to fail if
  //      * `dest` already exists.
  //      */
  //     function copyFile(src: PathLike, dest: PathLike, flags?: number): Promise<void>;

  //     /**
  //      * Asynchronous open(2) - open and possibly create a file.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * @param mode A file mode. If a string is passed, it is parsed as an octal integer. If not
  //      * supplied, defaults to `0o666`.
  //      */
  //     function open(path: PathLike, flags: string | number, mode?: string | number): Promise<FileHandle>;

  //     /**
  //      * Asynchronously reads data from the file referenced by the supplied `FileHandle`.
  //      * @param handle A `FileHandle`.
  //      * @param buffer The buffer that the data will be written to.
  //      * @param offset The offset in the buffer at which to start writing.
  //      * @param length The number of bytes to read.
  //      * @param position The offset from the beginning of the file from which data should be read. If
  //      * `null`, data will be read from the current position.
  //      */
  //     function read<TBuffer extends Uint8Array>(
  //         handle: FileHandle,
  //         buffer: TBuffer,
  //         offset?: number | null,
  //         length?: number | null,
  //         position?: number | null,
  //     ): Promise<{ bytesRead: number, buffer: TBuffer }>;

  //     /**
  //      * Asynchronously writes `buffer` to the file referenced by the supplied `FileHandle`.
  //      * It is unsafe to call `fsPromises.write()` multiple times on the same file without waiting for the `Promise`
  //      * to be resolved (or rejected). For this scenario, `fs.createWriteStream` is strongly recommended.
  //      * @param handle A `FileHandle`.
  //      * @param buffer The buffer that the data will be written to.
  //      * @param offset The part of the buffer to be written. If not supplied, defaults to `0`.
  //      * @param length The number of bytes to write. If not supplied, defaults to `buffer.length - offset`.
  //      * @param position The offset from the beginning of the file where this data should be written. If not supplied, defaults to the current position.
  //      */
  //     function write<TBuffer extends Uint8Array>(
  //         handle: FileHandle,
  //         buffer: TBuffer,
  //         offset?: number | null,
  //         length?: number | null, position?: number | null): Promise<{ bytesWritten: number, buffer: TBuffer }>;

  //     /**
  //      * Asynchronously writes `string` to the file referenced by the supplied `FileHandle`.
  //      * It is unsafe to call `fsPromises.write()` multiple times on the same file without waiting for the `Promise`
  //      * to be resolved (or rejected). For this scenario, `fs.createWriteStream` is strongly recommended.
  //      * @param handle A `FileHandle`.
  //      * @param string A string to write. If something other than a string is supplied it will be coerced to a string.
  //      * @param position The offset from the beginning of the file where this data should be written. If not supplied, defaults to the current position.
  //      * @param encoding The expected string encoding.
  //      */
  //     function write(handle: FileHandle, string: any, position?: number | null, encoding?: string | null): Promise<{ bytesWritten: number, buffer: string }>;

  //     /**
  //      * Asynchronous rename(2) - Change the name or location of a file or directory.
  //      * @param oldPath A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * URL support is _experimental_.
  //      * @param newPath A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * URL support is _experimental_.
  //      */
  //     function rename(oldPath: PathLike, newPath: PathLike): Promise<void>;

  //     /**
  //      * Asynchronous truncate(2) - Truncate a file to a specified length.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * @param len If not specified, defaults to `0`.
  //      */
  //     function truncate(path: PathLike, len?: number): Promise<void>;

  //     /**
  //      * Asynchronous ftruncate(2) - Truncate a file to a specified length.
  //      * @param handle A `FileHandle`.
  //      * @param len If not specified, defaults to `0`.
  //      */
  //     function ftruncate(handle: FileHandle, len?: number): Promise<void>;

  //     /**
  //      * Asynchronous rmdir(2) - delete a directory.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      */
  //     function rmdir(path: PathLike, options?: RmDirAsyncOptions): Promise<void>;

  //     /**
  //      * Asynchronous fdatasync(2) - synchronize a file's in-core state with storage device.
  //      * @param handle A `FileHandle`.
  //      */
  //     function fdatasync(handle: FileHandle): Promise<void>;

  //     /**
  //      * Asynchronous fsync(2) - synchronize a file's in-core state with the underlying storage device.
  //      * @param handle A `FileHandle`.
  //      */
  //     function fsync(handle: FileHandle): Promise<void>;

  //     /**
  //      * Asynchronous mkdir(2) - create a directory.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * @param options Either the file mode, or an object optionally specifying the file mode and whether parent folders
  //      * should be created. If a string is passed, it is parsed as an octal integer. If not specified, defaults to `0o777`.
  //      */
  //     function mkdir(path: PathLike, options?: number | string | MakeDirectoryOptions | null): Promise<void>;

  //     /**
  //      * Asynchronous readdir(3) - read a directory.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //      */
  //     function readdir(path: PathLike, options?: { encoding?: BufferEncoding | null; withFileTypes?: false } | BufferEncoding | null): Promise<string[]>;

  //     /**
  //      * Asynchronous readdir(3) - read a directory.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //      */
  //     function readdir(path: PathLike, options: { encoding: "buffer"; withFileTypes?: false } | "buffer"): Promise<Buffer[]>;

  //     /**
  //      * Asynchronous readdir(3) - read a directory.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //      */
  //     function readdir(path: PathLike, options?: { encoding?: string | null; withFileTypes?: false } | string | null): Promise<string[] | Buffer[]>;

  //     /**
  //      * Asynchronous readdir(3) - read a directory.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * @param options If called with `withFileTypes: true` the result data will be an array of Dirent.
  //      */
  //     function readdir(path: PathLike, options: { encoding?: string | null; withFileTypes: true }): Promise<Dirent[]>;

  //     /**
  //      * Asynchronous readlink(2) - read value of a symbolic link.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //      */
  //     function readlink(path: PathLike, options?: { encoding?: BufferEncoding | null } | BufferEncoding | null): Promise<string>;

  //     /**
  //      * Asynchronous readlink(2) - read value of a symbolic link.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //      */
  //     function readlink(path: PathLike, options: { encoding: "buffer" } | "buffer"): Promise<Buffer>;

  //     /**
  //      * Asynchronous readlink(2) - read value of a symbolic link.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //      */
  //     function readlink(path: PathLike, options?: { encoding?: string | null } | string | null): Promise<string | Buffer>;

  //     /**
  //      * Asynchronous symlink(2) - Create a new symbolic link to an existing file.
  //      * @param target A path to an existing file. If a URL is provided, it must use the `file:` protocol.
  //      * @param path A path to the new symlink. If a URL is provided, it must use the `file:` protocol.
  //      * @param type May be set to `'dir'`, `'file'`, or `'junction'` (default is `'file'`) and is only available on Windows (ignored on other platforms).
  //      * When using `'junction'`, the `target` argument will automatically be normalized to an absolute path.
  //      */
  //     function symlink(target: PathLike, path: PathLike, type?: string | null): Promise<void>;

  //     /**
  //      * Asynchronous fstat(2) - Get file status.
  //      * @param handle A `FileHandle`.
  //      */
  //     function fstat(handle: FileHandle): Promise<Stats>;

  //     /**
  //      * Asynchronous lstat(2) - Get file status. Does not dereference symbolic links.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      */
  //     function lstat(path: PathLike): Promise<Stats>;

  //     /**
  //      * Asynchronous stat(2) - Get file status.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      */
  //     function stat(path: PathLike): Promise<Stats>;

  //     /**
  //      * Asynchronous link(2) - Create a new link (also known as a hard link) to an existing file.
  //      * @param existingPath A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * @param newPath A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      */
  //     function link(existingPath: PathLike, newPath: PathLike): Promise<void>;

  //     /**
  //      * Asynchronous unlink(2) - delete a name and possibly the file it refers to.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      */
  //     function unlink(path: PathLike): Promise<void>;

  //     /**
  //      * Asynchronous fchmod(2) - Change permissions of a file.
  //      * @param handle A `FileHandle`.
  //      * @param mode A file mode. If a string is passed, it is parsed as an octal integer.
  //      */
  //     function fchmod(handle: FileHandle, mode: string | number): Promise<void>;

  //     /**
  //      * Asynchronous chmod(2) - Change permissions of a file.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * @param mode A file mode. If a string is passed, it is parsed as an octal integer.
  //      */
  //     function chmod(path: PathLike, mode: string | number): Promise<void>;

  //     /**
  //      * Asynchronous lchmod(2) - Change permissions of a file. Does not dereference symbolic links.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * @param mode A file mode. If a string is passed, it is parsed as an octal integer.
  //      */
  //     function lchmod(path: PathLike, mode: string | number): Promise<void>;

  //     /**
  //      * Asynchronous lchown(2) - Change ownership of a file. Does not dereference symbolic links.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      */
  //     function lchown(path: PathLike, uid: number, gid: number): Promise<void>;

  //     /**
  //      * Asynchronous fchown(2) - Change ownership of a file.
  //      * @param handle A `FileHandle`.
  //      */
  //     function fchown(handle: FileHandle, uid: number, gid: number): Promise<void>;

  //     /**
  //      * Asynchronous chown(2) - Change ownership of a file.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      */
  //     function chown(path: PathLike, uid: number, gid: number): Promise<void>;

  //     /**
  //      * Asynchronously change file timestamps of the file referenced by the supplied path.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * @param atime The last access time. If a string is provided, it will be coerced to number.
  //      * @param mtime The last modified time. If a string is provided, it will be coerced to number.
  //      */
  //     function utimes(path: PathLike, atime: string | number | Date, mtime: string | number | Date): Promise<void>;

  //     /**
  //      * Asynchronously change file timestamps of the file referenced by the supplied `FileHandle`.
  //      * @param handle A `FileHandle`.
  //      * @param atime The last access time. If a string is provided, it will be coerced to number.
  //      * @param mtime The last modified time. If a string is provided, it will be coerced to number.
  //      */
  //     function futimes(handle: FileHandle, atime: string | number | Date, mtime: string | number | Date): Promise<void>;

  //     /**
  //      * Asynchronous realpath(3) - return the canonicalized absolute pathname.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //      */
  //     function realpath(path: PathLike, options?: { encoding?: BufferEncoding | null } | BufferEncoding | null): Promise<string>;

  //     /**
  //      * Asynchronous realpath(3) - return the canonicalized absolute pathname.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //      */
  //     function realpath(path: PathLike, options: { encoding: "buffer" } | "buffer"): Promise<Buffer>;

  //     /**
  //      * Asynchronous realpath(3) - return the canonicalized absolute pathname.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //      */
  //     function realpath(path: PathLike, options?: { encoding?: string | null } | string | null): Promise<string | Buffer>;

  //     /**
  //      * Asynchronously creates a unique temporary directory.
  //      * Generates six random characters to be appended behind a required `prefix` to create a unique temporary directory.
  //      * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //      */
  //     function mkdtemp(prefix: string, options?: { encoding?: BufferEncoding | null } | BufferEncoding | null): Promise<string>;

  //     /**
  //      * Asynchronously creates a unique temporary directory.
  //      * Generates six random characters to be appended behind a required `prefix` to create a unique temporary directory.
  //      * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //      */
  //     function mkdtemp(prefix: string, options: { encoding: "buffer" } | "buffer"): Promise<Buffer>;

  //     /**
  //      * Asynchronously creates a unique temporary directory.
  //      * Generates six random characters to be appended behind a required `prefix` to create a unique temporary directory.
  //      * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //      */
  //     function mkdtemp(prefix: string, options?: { encoding?: string | null } | string | null): Promise<string | Buffer>;

  //     /**
  //      * Asynchronously writes data to a file, replacing the file if it already exists.
  //      * It is unsafe to call `fsPromises.writeFile()` multiple times on the same file without waiting for the `Promise` to be resolved (or rejected).
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * URL support is _experimental_.
  //      * If a `FileHandle` is provided, the underlying file will _not_ be closed automatically.
  //      * @param data The data to write. If something other than a `Buffer` or `Uint8Array` is provided, the value is coerced to a string.
  //      * @param options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
  //      * If `encoding` is not supplied, the default of `'utf8'` is used.
  //      * If `mode` is not supplied, the default of `0o666` is used.
  //      * If `mode` is a string, it is parsed as an octal integer.
  //      * If `flag` is not supplied, the default of `'w'` is used.
  //      */
  //     function writeFile(path: PathLike | FileHandle, data: any, options?: { encoding?: string | null, mode?: string | number, flag?: string | number } | string | null): Promise<void>;

  //     /**
  //      * Asynchronously append data to a file, creating the file if it does not exist.
  //      * @param file A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * URL support is _experimental_.
  //      * If a `FileHandle` is provided, the underlying file will _not_ be closed automatically.
  //      * @param data The data to write. If something other than a `Buffer` or `Uint8Array` is provided, the value is coerced to a string.
  //      * @param options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
  //      * If `encoding` is not supplied, the default of `'utf8'` is used.
  //      * If `mode` is not supplied, the default of `0o666` is used.
  //      * If `mode` is a string, it is parsed as an octal integer.
  //      * If `flag` is not supplied, the default of `'a'` is used.
  //      */
  //     function appendFile(path: PathLike | FileHandle, data: any, options?: { encoding?: string | null, mode?: string | number, flag?: string | number } | string | null): Promise<void>;

  //     /**
  //      * Asynchronously reads the entire contents of a file.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * If a `FileHandle` is provided, the underlying file will _not_ be closed automatically.
  //      * @param options An object that may contain an optional flag.
  //      * If a flag is not provided, it defaults to `'r'`.
  //      */
  //     function readFile(path: PathLike | FileHandle, options?: { encoding?: null, flag?: string | number } | null): Promise<Buffer>;

  //     /**
  //      * Asynchronously reads the entire contents of a file.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * If a `FileHandle` is provided, the underlying file will _not_ be closed automatically.
  //      * @param options An object that may contain an optional flag.
  //      * If a flag is not provided, it defaults to `'r'`.
  //      */
  readFile(
    path: PathLike,
    options:
      | { encoding: BufferEncoding; flag?: string | number }
      | BufferEncoding
  ): Promise<string>;

  //     /**
  //      * Asynchronously reads the entire contents of a file.
  //      * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //      * If a `FileHandle` is provided, the underlying file will _not_ be closed automatically.
  //      * @param options An object that may contain an optional flag.
  //      * If a flag is not provided, it defaults to `'r'`.
  //      */
  //     function readFile(path: PathLike | FileHandle, options?: { encoding?: string | null, flag?: string | number } | string | null): Promise<string | Buffer>;

  //     function opendir(path: string, options?: OpenDirOptions): Promise<Dir>;
}

interface FS {
  ///**
  // * Asynchronous rename(2) - Change the name or location of a file or directory.
  // * @param oldPath A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * URL support is _experimental_.
  // * @param newPath A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * URL support is _experimental_.
  // */
  //rename(oldPath: PathLike, newPath: PathLike, callback: NoParamCallback): void;

  ///**
  // * Synchronous rename(2) - Change the name or location of a file or directory.
  // * @param oldPath A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * URL support is _experimental_.
  // * @param newPath A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * URL support is _experimental_.
  // */
  //renameSync(oldPath: PathLike, newPath: PathLike): void;

  ///**
  // * Asynchronous truncate(2) - Truncate a file to a specified length.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param len If not specified, defaults to `0`.
  // */
  //truncate(path: PathLike, len: number | undefined | null, callback: NoParamCallback): void;

  ///**
  // * Asynchronous truncate(2) - Truncate a file to a specified length.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * URL support is _experimental_.
  // */
  //truncate(path: PathLike, callback: NoParamCallback): void;

  ///**
  // * Synchronous truncate(2) - Truncate a file to a specified length.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param len If not specified, defaults to `0`.
  // */
  //truncateSync(path: PathLike, len?: number | null): void;

  ///**
  // * Asynchronous ftruncate(2) - Truncate a file to a specified length.
  // * @param fd A file descriptor.
  // * @param len If not specified, defaults to `0`.
  // */
  //ftruncate(fd: number, len: number | undefined | null, callback: NoParamCallback): void;

  ///**
  // * Asynchronous ftruncate(2) - Truncate a file to a specified length.
  // * @param fd A file descriptor.
  // */
  //ftruncate(fd: number, callback: NoParamCallback): void;

  ///**
  // * Synchronous ftruncate(2) - Truncate a file to a specified length.
  // * @param fd A file descriptor.
  // * @param len If not specified, defaults to `0`.
  // */
  //ftruncateSync(fd: number, len?: number | null): void;

  ///**
  // * Asynchronous chown(2) - Change ownership of a file.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // */
  //chown(path: PathLike, uid: number, gid: number, callback: NoParamCallback): void;

  ///**
  // * Synchronous chown(2) - Change ownership of a file.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // */
  //chownSync(path: PathLike, uid: number, gid: number): void;

  ///**
  // * Asynchronous fchown(2) - Change ownership of a file.
  // * @param fd A file descriptor.
  // */
  //fchown(fd: number, uid: number, gid: number, callback: NoParamCallback): void;

  ///**
  // * Synchronous fchown(2) - Change ownership of a file.
  // * @param fd A file descriptor.
  // */
  //fchownSync(fd: number, uid: number, gid: number): void;

  ///**
  // * Asynchronous lchown(2) - Change ownership of a file. Does not dereference symbolic links.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // */
  //lchown(path: PathLike, uid: number, gid: number, callback: NoParamCallback): void;

  ///**
  // * Synchronous lchown(2) - Change ownership of a file. Does not dereference symbolic links.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // */
  //lchownSync(path: PathLike, uid: number, gid: number): void;

  ///**
  // * Asynchronous chmod(2) - Change permissions of a file.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param mode A file mode. If a string is passed, it is parsed as an octal integer.
  // */
  //chmod(path: PathLike, mode: string | number, callback: NoParamCallback): void;

  ///**
  // * Synchronous chmod(2) - Change permissions of a file.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param mode A file mode. If a string is passed, it is parsed as an octal integer.
  // */
  //chmodSync(path: PathLike, mode: string | number): void;

  ///**
  // * Asynchronous fchmod(2) - Change permissions of a file.
  // * @param fd A file descriptor.
  // * @param mode A file mode. If a string is passed, it is parsed as an octal integer.
  // */
  //fchmod(fd: number, mode: string | number, callback: NoParamCallback): void;

  ///**
  // * Synchronous fchmod(2) - Change permissions of a file.
  // * @param fd A file descriptor.
  // * @param mode A file mode. If a string is passed, it is parsed as an octal integer.
  // */
  //fchmodSync(fd: number, mode: string | number): void;

  ///**
  // * Asynchronous lchmod(2) - Change permissions of a file. Does not dereference symbolic links.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param mode A file mode. If a string is passed, it is parsed as an octal integer.
  // */
  //lchmod(path: PathLike, mode: string | number, callback: NoParamCallback): void;

  ///**
  // * Synchronous lchmod(2) - Change permissions of a file. Does not dereference symbolic links.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param mode A file mode. If a string is passed, it is parsed as an octal integer.
  // */
  //lchmodSync(path: PathLike, mode: string | number): void;

  ///**
  // * Asynchronous stat(2) - Get file status.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // */
  //stat(path: PathLike, callback: (err: ErrnoException | null, stats: Stats) => void): void;

  ///**
  // * Synchronous stat(2) - Get file status.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // */
  //statSync(path: PathLike): Stats;

  ///**
  // * Asynchronous fstat(2) - Get file status.
  // * @param fd A file descriptor.
  // */
  //fstat(fd: number, callback: (err: ErrnoException | null, stats: Stats) => void): void;

  ///**
  // * Synchronous fstat(2) - Get file status.
  // * @param fd A file descriptor.
  // */
  //fstatSync(fd: number): Stats;

  ///**
  // * Asynchronous lstat(2) - Get file status. Does not dereference symbolic links.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // */
  //lstat(path: PathLike, callback: (err: ErrnoException | null, stats: Stats) => void): void;

  ///**
  // * Synchronous lstat(2) - Get file status. Does not dereference symbolic links.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // */
  //lstatSync(path: PathLike): Stats;

  ///**
  // * Asynchronous link(2) - Create a new link (also known as a hard link) to an existing file.
  // * @param existingPath A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param newPath A path to a file. If a URL is provided, it must use the `file:` protocol.
  // */
  //link(existingPath: PathLike, newPath: PathLike, callback: NoParamCallback): void;

  ///**
  // * Synchronous link(2) - Create a new link (also known as a hard link) to an existing file.
  // * @param existingPath A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param newPath A path to a file. If a URL is provided, it must use the `file:` protocol.
  // */
  //linkSync(existingPath: PathLike, newPath: PathLike): void;

  ///**
  // * Asynchronous symlink(2) - Create a new symbolic link to an existing file.
  // * @param target A path to an existing file. If a URL is provided, it must use the `file:` protocol.
  // * @param path A path to the new symlink. If a URL is provided, it must use the `file:` protocol.
  // * @param type May be set to `'dir'`, `'file'`, or `'junction'` (default is `'file'`) and is only available on Windows (ignored on other platforms).
  // * When using `'junction'`, the `target` argument will automatically be normalized to an absolute path.
  // */
  ////symlink(target: PathLike, path: PathLike, type: Type | undefined | null, callback: NoParamCallback): void;

  ///**
  // * Asynchronous symlink(2) - Create a new symbolic link to an existing file.
  // * @param target A path to an existing file. If a URL is provided, it must use the `file:` protocol.
  // * @param path A path to the new symlink. If a URL is provided, it must use the `file:` protocol.
  // */
  //symlink(target: PathLike, path: PathLike, callback: NoParamCallback): void;

  ///**
  // * Synchronous symlink(2) - Create a new symbolic link to an existing file.
  // * @param target A path to an existing file. If a URL is provided, it must use the `file:` protocol.
  // * @param path A path to the new symlink. If a URL is provided, it must use the `file:` protocol.
  // * @param type May be set to `'dir'`, `'file'`, or `'junction'` (default is `'file'`) and is only available on Windows (ignored on other platforms).
  // * When using `'junction'`, the `target` argument will automatically be normalized to an absolute path.
  // */
  //symlinkSync(target: PathLike, path: PathLike): void;

  ///**
  // * Asynchronous readlink(2) - read value of a symbolic link.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  // */
  //readlink(
  //    path: PathLike,
  //    options: { encoding?: BufferEncoding | null } | BufferEncoding | undefined | null,
  //    callback: (err: ErrnoException | null, linkString: string) => void
  //): void;

  ///**
  // * Asynchronous readlink(2) - read value of a symbolic link.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  // */
  //readlink(path: PathLike, options: { encoding: "buffer" } | "buffer", callback: (err: ErrnoException | null, linkString: Buffer) => void): void;

  ///**
  // * Asynchronous readlink(2) - read value of a symbolic link.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  // */
  //readlink(path: PathLike, options: { encoding?: string | null } | string | undefined | null, callback: (err: ErrnoException | null, linkString: string | Buffer) => void): void;

  ///**
  // * Asynchronous readlink(2) - read value of a symbolic link.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // */
  //readlink(path: PathLike, callback: (err: ErrnoException | null, linkString: string) => void): void;

  ///**
  // * Synchronous readlink(2) - read value of a symbolic link.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  // */
  //readlinkSync(path: PathLike, options?: { encoding?: BufferEncoding | null } | BufferEncoding | null): string;

  ///**
  // * Synchronous readlink(2) - read value of a symbolic link.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  // */
  //readlinkSync(path: PathLike, options: { encoding: "buffer" } | "buffer"): Buffer;

  ///**
  // * Synchronous readlink(2) - read value of a symbolic link.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  // */
  //readlinkSync(path: PathLike, options?: { encoding?: string | null } | string | null): string | Buffer;

  ///**
  // * Asynchronous realpath(3) - return the canonicalized absolute pathname.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  // */
  //realpath(
  //    path: PathLike,
  //    options: { encoding?: BufferEncoding | null } | BufferEncoding | undefined | null,
  //    callback: (err: ErrnoException | null, resolvedPath: string) => void
  //): void;

  ///**
  // * Asynchronous realpath(3) - return the canonicalized absolute pathname.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  // */
  //realpath(path: PathLike, options: { encoding: "buffer" } | "buffer", callback: (err: ErrnoException | null, resolvedPath: Buffer) => void): void;

  ///**
  // * Asynchronous realpath(3) - return the canonicalized absolute pathname.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  // */
  //realpath(path: PathLike, options: { encoding?: string | null } | string | undefined | null, callback: (err: ErrnoException | null, resolvedPath: string | Buffer) => void): void;

  ///**
  // * Asynchronous realpath(3) - return the canonicalized absolute pathname.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // */
  //realpath(path: PathLike, callback: (err: ErrnoException | null, resolvedPath: string) => void): void;

  ///**
  // * Synchronous realpath(3) - return the canonicalized absolute pathname.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  // */
  //realpathSync(path: PathLike, options?: { encoding?: BufferEncoding | null } | BufferEncoding | null): string;

  ///**
  // * Synchronous realpath(3) - return the canonicalized absolute pathname.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  // */
  //realpathSync(path: PathLike, options: { encoding: "buffer" } | "buffer"): Buffer;

  ///**
  // * Synchronous realpath(3) - return the canonicalized absolute pathname.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // * @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  // */
  //realpathSync(path: PathLike, options?: { encoding?: string | null } | string | null): string | Buffer;

  ///**
  // * Asynchronous unlink(2) - delete a name and possibly the file it refers to.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // */
  //unlink(path: PathLike, callback: NoParamCallback): void;

  ///**
  // * Synchronous unlink(2) - delete a name and possibly the file it refers to.
  // * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  // */
  //unlinkSync(path: PathLike): void;

  ///**
  //* Asynchronous rmdir(2) - delete a directory.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //*/
  //rmdir(path: PathLike, callback: NoParamCallback): void;
  //rmdir(path: PathLike, options: RmDirAsyncOptions, callback: NoParamCallback): void;

  ///**
  //* Synchronous rmdir(2) - delete a directory.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //*/
  //rmdirSync(path: PathLike, options?: RmDirOptions): void;

  ///**
  //* Asynchronous mkdir(2) - create a directory.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* @param options Either the file mode, or an object optionally specifying the file mode and whether parent folders
  //* should be created. If a string is passed, it is parsed as an octal integer. If not specified, defaults to `0o777`.
  //*/
  //mkdir(path: PathLike, options: number | string | MakeDirectoryOptions | undefined | null, callback: NoParamCallback): void;

  ///**
  //* Asynchronous mkdir(2) - create a directory with a mode of `0o777`.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //*/
  //mkdir(path: PathLike, callback: NoParamCallback): void;

  ///**
  //* Synchronous mkdir(2) - create a directory.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* @param options Either the file mode, or an object optionally specifying the file mode and whether parent folders
  //* should be created. If a string is passed, it is parsed as an octal integer. If not specified, defaults to `0o777`.
  //*/
  //mkdirSync(path: PathLike, options?: number | string | MakeDirectoryOptions | null): void;

  ///**
  //* Asynchronously creates a unique temporary directory.
  //* Generates six random characters to be appended behind a required prefix to create a unique temporary directory.
  //* @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //*/
  //mkdtemp(prefix: string, options: { encoding?: BufferEncoding | null } | BufferEncoding | undefined | null, callback: (err: ErrnoException | null, folder: string) => void): void;

  ///**
  //* Asynchronously creates a unique temporary directory.
  //* Generates six random characters to be appended behind a required prefix to create a unique temporary directory.
  //* @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //*/
  //mkdtemp(prefix: string, options: "buffer" | { encoding: "buffer" }, callback: (err: ErrnoException | null, folder: Buffer) => void): void;

  ///**
  //* Asynchronously creates a unique temporary directory.
  //* Generates six random characters to be appended behind a required prefix to create a unique temporary directory.
  //* @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //*/
  //mkdtemp(prefix: string, options: { encoding?: string | null } | string | undefined | null, callback: (err: ErrnoException | null, folder: string | Buffer) => void): void;

  ///**
  //* Asynchronously creates a unique temporary directory.
  //* Generates six random characters to be appended behind a required prefix to create a unique temporary directory.
  //*/
  //mkdtemp(prefix: string, callback: (err: ErrnoException | null, folder: string) => void): void;

  ///**
  //* Synchronously creates a unique temporary directory.
  //* Generates six random characters to be appended behind a required prefix to create a unique temporary directory.
  //* @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //*/
  //mkdtempSync(prefix: string, options?: { encoding?: BufferEncoding | null } | BufferEncoding | null): string;

  ///**
  //* Synchronously creates a unique temporary directory.
  //* Generates six random characters to be appended behind a required prefix to create a unique temporary directory.
  //* @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //*/
  //mkdtempSync(prefix: string, options: { encoding: "buffer" } | "buffer"): Buffer;

  ///**
  //* Synchronously creates a unique temporary directory.
  //* Generates six random characters to be appended behind a required prefix to create a unique temporary directory.
  //* @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //*/
  //mkdtempSync(prefix: string, options?: { encoding?: string | null } | string | null): string | Buffer;

  ///**
  //* Asynchronous readdir(3) - read a directory.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //*/
  //readdir(
  //  path: PathLike,
  //  options: { encoding: BufferEncoding | null; withFileTypes?: false } | BufferEncoding | undefined | null,
  //  callback: (err: ErrnoException | null, files: string[]) => void,
  //): void;

  ///**
  //* Asynchronous readdir(3) - read a directory.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //*/
  //readdir(path: PathLike, options: { encoding: "buffer"; withFileTypes?: false } | "buffer", callback: (err: ErrnoException | null, files: Buffer[]) => void): void;

  ///**
  //* Asynchronous readdir(3) - read a directory.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //*/
  //readdir(
  //  path: PathLike,
  //  options: { encoding?: string | null; withFileTypes?: false } | string | undefined | null,
  //  callback: (err: ErrnoException | null, files: string[] | Buffer[]) => void,
  //): void;

  ///**
  //* Asynchronous readdir(3) - read a directory.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //*/
  //readdir(path: PathLike, callback: (err: ErrnoException | null, files: string[]) => void): void;

  ///**
  //* Asynchronous readdir(3) - read a directory.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* @param options If called with `withFileTypes: true` the result data will be an array of Dirent.
  //*/
  //readdir(path: PathLike, options: { encoding?: string | null; withFileTypes: true }, callback: (err: ErrnoException | null, files: Dirent[]) => void): void;

  ///**
  //* Synchronous readdir(3) - read a directory.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //*/
  //readdirSync(path: PathLike, options?: { encoding: BufferEncoding | null; withFileTypes?: false } | BufferEncoding | null): string[];

  ///**
  //* Synchronous readdir(3) - read a directory.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //*/
  //readdirSync(path: PathLike, options: { encoding: "buffer"; withFileTypes?: false } | "buffer"): Buffer[];

  ///**
  //* Synchronous readdir(3) - read a directory.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* @param options The encoding (or an object specifying the encoding), used as the encoding of the result. If not provided, `'utf8'` is used.
  //*/
  //readdirSync(path: PathLike, options?: { encoding?: string | null; withFileTypes?: false } | string | null): string[] | Buffer[];

  ///**
  //* Synchronous readdir(3) - read a directory.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* @param options If called with `withFileTypes: true` the result data will be an array of Dirent.
  //*/
  //readdirSync(path: PathLike, options: { encoding?: string | null; withFileTypes: true }): Dirent[];

  ///**
  //* Asynchronous close(2) - close a file descriptor.
  //* @param fd A file descriptor.
  //*/
  //close(fd: number, callback: NoParamCallback): void;

  ///**
  //* Synchronous close(2) - close a file descriptor.
  //* @param fd A file descriptor.
  //*/
  //closeSync(fd: number): void;

  ///**
  //* Asynchronous open(2) - open and possibly create a file.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* @param mode A file mode. If a string is passed, it is parsed as an octal integer. If not supplied, defaults to `0o666`.
  //*/
  //open(path: PathLike, flags: string | number, mode: string | number | undefined | null, callback: (err: ErrnoException | null, fd: number) => void): void;

  ///**
  //* Asynchronous open(2) - open and possibly create a file. If the file is created, its mode will be `0o666`.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //*/
  //open(path: PathLike, flags: string | number, callback: (err: ErrnoException | null, fd: number) => void): void;

  ///**
  //* Synchronous open(2) - open and possibly create a file, returning a file descriptor..
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* @param mode A file mode. If a string is passed, it is parsed as an octal integer. If not supplied, defaults to `0o666`.
  //*/
  //openSync(path: PathLike, flags: string | number, mode?: string | number | null): number;

  ///**
  //* Asynchronously change file timestamps of the file referenced by the supplied path.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* @param atime The last access time. If a string is provided, it will be coerced to number.
  //* @param mtime The last modified time. If a string is provided, it will be coerced to number.
  //*/
  //utimes(path: PathLike, atime: string | number | Date, mtime: string | number | Date, callback: NoParamCallback): void;

  ///**
  //* Synchronously change file timestamps of the file referenced by the supplied path.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* @param atime The last access time. If a string is provided, it will be coerced to number.
  //* @param mtime The last modified time. If a string is provided, it will be coerced to number.
  //*/
  //utimesSync(path: PathLike, atime: string | number | Date, mtime: string | number | Date): void;

  ///**
  //* Asynchronously change file timestamps of the file referenced by the supplied file descriptor.
  //* @param fd A file descriptor.
  //* @param atime The last access time. If a string is provided, it will be coerced to number.
  //* @param mtime The last modified time. If a string is provided, it will be coerced to number.
  //*/
  //futimes(fd: number, atime: string | number | Date, mtime: string | number | Date, callback: NoParamCallback): void;

  ///**
  //* Synchronously change file timestamps of the file referenced by the supplied file descriptor.
  //* @param fd A file descriptor.
  //* @param atime The last access time. If a string is provided, it will be coerced to number.
  //* @param mtime The last modified time. If a string is provided, it will be coerced to number.
  //*/
  //futimesSync(fd: number, atime: string | number | Date, mtime: string | number | Date): void;

  ///**
  //* Asynchronous fsync(2) - synchronize a file's in-core state with the underlying storage device.
  //* @param fd A file descriptor.
  //*/
  //fsync(fd: number, callback: NoParamCallback): void;

  ///**
  //* Synchronous fsync(2) - synchronize a file's in-core state with the underlying storage device.
  //* @param fd A file descriptor.
  //*/
  //fsyncSync(fd: number): void;

  ///**
  //* Asynchronously writes `buffer` to the file referenced by the supplied file descriptor.
  //* @param fd A file descriptor.
  //* @param offset The part of the buffer to be written. If not supplied, defaults to `0`.
  //* @param length The number of bytes to write. If not supplied, defaults to `buffer.length - offset`.
  //* @param position The offset from the beginning of the file where this data should be written. If not supplied, defaults to the current position.
  //*/
  //write<TBuffer extends ArrayBufferView>(
  //  fd: number,
  //  buffer: TBuffer,
  //  offset: number | undefined | null,
  //  length: number | undefined | null,
  //  position: number | undefined | null,
  //  callback: (err: ErrnoException | null, written: number, buffer: TBuffer) => void,
  //): void;

  ///**
  //* Asynchronously writes `buffer` to the file referenced by the supplied file descriptor.
  //* @param fd A file descriptor.
  //* @param offset The part of the buffer to be written. If not supplied, defaults to `0`.
  //* @param length The number of bytes to write. If not supplied, defaults to `buffer.length - offset`.
  //*/
  //write<TBuffer extends ArrayBufferView>(
  //  fd: number,
  //  buffer: TBuffer,
  //  offset: number | undefined | null,
  //  length: number | undefined | null,
  //  callback: (err: ErrnoException | null, written: number, buffer: TBuffer) => void,
  //): void;

  ///**
  //* Asynchronously writes `buffer` to the file referenced by the supplied file descriptor.
  //* @param fd A file descriptor.
  //* @param offset The part of the buffer to be written. If not supplied, defaults to `0`.
  //*/
  //write<TBuffer extends ArrayBufferView>(
  //  fd: number,
  //  buffer: TBuffer,
  //  offset: number | undefined | null,
  //  callback: (err: ErrnoException | null, written: number, buffer: TBuffer) => void
  //): void;

  ///**
  //* Asynchronously writes `buffer` to the file referenced by the supplied file descriptor.
  //* @param fd A file descriptor.
  //*/
  //write<TBuffer extends ArrayBufferView>(fd: number, buffer: TBuffer, callback: (err: ErrnoException | null, written: number, buffer: TBuffer) => void): void;

  ///**
  //* Asynchronously writes `string` to the file referenced by the supplied file descriptor.
  //* @param fd A file descriptor.
  //* @param string A string to write. If something other than a string is supplied it will be coerced to a string.
  //* @param position The offset from the beginning of the file where this data should be written. If not supplied, defaults to the current position.
  //* @param encoding The expected string encoding.
  //*/
  //write(
  //  fd: number,
  //  string: any,
  //  position: number | undefined | null,
  //  encoding: string | undefined | null,
  //  callback: (err: ErrnoException | null, written: number, str: string) => void,
  //): void;

  ///**
  //* Asynchronously writes `string` to the file referenced by the supplied file descriptor.
  //* @param fd A file descriptor.
  //* @param string A string to write. If something other than a string is supplied it will be coerced to a string.
  //* @param position The offset from the beginning of the file where this data should be written. If not supplied, defaults to the current position.
  //*/
  //write(fd: number, string: any, position: number | undefined | null, callback: (err: ErrnoException | null, written: number, str: string) => void): void;

  ///**
  //* Asynchronously writes `string` to the file referenced by the supplied file descriptor.
  //* @param fd A file descriptor.
  //* @param string A string to write. If something other than a string is supplied it will be coerced to a string.
  //*/
  //write(fd: number, string: any, callback: (err: ErrnoException | null, written: number, str: string) => void): void;

  ///**
  //* Synchronously writes `buffer` to the file referenced by the supplied file descriptor, returning the number of bytes written.
  //* @param fd A file descriptor.
  //* @param offset The part of the buffer to be written. If not supplied, defaults to `0`.
  //* @param length The number of bytes to write. If not supplied, defaults to `buffer.length - offset`.
  //* @param position The offset from the beginning of the file where this data should be written. If not supplied, defaults to the current position.
  //*/
  //writeSync(fd: number, buffer: ArrayBufferView, offset?: number | null, length?: number | null, position?: number | null): number;

  ///**
  //* Synchronously writes `string` to the file referenced by the supplied file descriptor, returning the number of bytes written.
  //* @param fd A file descriptor.
  //* @param string A string to write. If something other than a string is supplied it will be coerced to a string.
  //* @param position The offset from the beginning of the file where this data should be written. If not supplied, defaults to the current position.
  //* @param encoding The expected string encoding.
  //*/
  //writeSync(fd: number, string: any, position?: number | null, encoding?: string | null): number;

  ///**
  //* Asynchronously reads data from the file referenced by the supplied file descriptor.
  //* @param fd A file descriptor.
  //* @param buffer The buffer that the data will be written to.
  //* @param offset The offset in the buffer at which to start writing.
  //* @param length The number of bytes to read.
  //* @param position The offset from the beginning of the file from which data should be read. If `null`, data will be read from the current position.
  //*/
  //read<TBuffer extends ArrayBufferView>(
  //  fd: number,
  //  buffer: TBuffer,
  //  offset: number,
  //  length: number,
  //  position: number | null,
  //  callback: (err: ErrnoException | null, bytesRead: number, buffer: TBuffer) => void,
  //): void;

  ///**
  //* Synchronously reads data from the file referenced by the supplied file descriptor, returning the number of bytes read.
  //* @param fd A file descriptor.
  //* @param buffer The buffer that the data will be written to.
  //* @param offset The offset in the buffer at which to start writing.
  //* @param length The number of bytes to read.
  //* @param position The offset from the beginning of the file from which data should be read. If `null`, data will be read from the current position.
  //*/
  //readSync(fd: number, buffer: ArrayBufferView, offset: number, length: number, position: number | null): number;

  ///**
  //* Asynchronously reads the entire contents of a file.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* If a file descriptor is provided, the underlying file will _not_ be closed automatically.
  //* @param options An object that may contain an optional flag.
  //* If a flag is not provided, it defaults to `'r'`.
  //*/
  //readFile(path: PathLike | number, options: { encoding?: null; flag?: string; } | undefined | null, callback: (err: ErrnoException | null, data: Buffer) => void): void;

  ///**
  //* Asynchronously reads the entire contents of a file.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //* If a file descriptor is provided, the underlying file will _not_ be closed automatically.
  //* @param options Either the encoding for the result, or an object that contains the encoding and an optional flag.
  //* If a flag is not provided, it defaults to `'r'`.
  //*/
  //readFile(path: PathLike | number, options: { encoding: string; flag?: string; } | string, callback: (err: ErrnoException | null, data: string) => void): void;

  ///**
  //* Asynchronously reads the entire contents of a file.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //* If a file descriptor is provided, the underlying file will _not_ be closed automatically.
  //* @param options Either the encoding for the result, or an object that contains the encoding and an optional flag.
  //* If a flag is not provided, it defaults to `'r'`.
  //*/
  //readFile(
  //  path: PathLike | number,
  //  options: { encoding?: string | null; flag?: string; } | string | undefined | null,
  //  callback: (err: ErrnoException | null, data: string | Buffer) => void,
  //): void;

  ///**
  //* Asynchronously reads the entire contents of a file.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* If a file descriptor is provided, the underlying file will _not_ be closed automatically.
  //*/
  //readFile(path: PathLike | number, callback: (err: ErrnoException | null, data: Buffer) => void): void;

  ///**
  //* Synchronously reads the entire contents of a file.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //* If a file descriptor is provided, the underlying file will _not_ be closed automatically.
  //* @param options An object that may contain an optional flag. If a flag is not provided, it defaults to `'r'`.
  //*/
  //readFileSync(path: PathLike | number, options?: { encoding?: null; flag?: string; } | null): Buffer;

  ///**
  //* Synchronously reads the entire contents of a file.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //* If a file descriptor is provided, the underlying file will _not_ be closed automatically.
  //* @param options Either the encoding for the result, or an object that contains the encoding and an optional flag.
  //* If a flag is not provided, it defaults to `'r'`.
  //*/
  //readFileSync(path: PathLike | number, options: { encoding: string; flag?: string; } | string): string;

  ///**
  //* Synchronously reads the entire contents of a file.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //* If a file descriptor is provided, the underlying file will _not_ be closed automatically.
  //* @param options Either the encoding for the result, or an object that contains the encoding and an optional flag.
  //* If a flag is not provided, it defaults to `'r'`.
  //*/
  ////readFileSync(path: PathLike | number, options?: { encoding?: string | null; flag?: string; } | string | null): string | Buffer;

  ///**
  //* Asynchronously writes data to a file, replacing the file if it already exists.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //* If a file descriptor is provided, the underlying file will _not_ be closed automatically.
  //* @param data The data to write. If something other than a Buffer or Uint8Array is provided, the value is coerced to a string.
  //* @param options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
  //* If `encoding` is not supplied, the default of `'utf8'` is used.
  //* If `mode` is not supplied, the default of `0o666` is used.
  //* If `mode` is a string, it is parsed as an octal integer.
  //* If `flag` is not supplied, the default of `'w'` is used.
  //*/
  //writeFile(path: PathLike | number, data: any, options: WriteFileOptions, callback: NoParamCallback): void;

  ///**
  //* Asynchronously writes data to a file, replacing the file if it already exists.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //* If a file descriptor is provided, the underlying file will _not_ be closed automatically.
  //* @param data The data to write. If something other than a Buffer or Uint8Array is provided, the value is coerced to a string.
  //*/
  //writeFile(path: PathLike | number, data: any, callback: NoParamCallback): void;

  ///**
  //* Synchronously writes data to a file, replacing the file if it already exists.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //* If a file descriptor is provided, the underlying file will _not_ be closed automatically.
  //* @param data The data to write. If something other than a Buffer or Uint8Array is provided, the value is coerced to a string.
  //* @param options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
  //* If `encoding` is not supplied, the default of `'utf8'` is used.
  //* If `mode` is not supplied, the default of `0o666` is used.
  //* If `mode` is a string, it is parsed as an octal integer.
  //* If `flag` is not supplied, the default of `'w'` is used.
  //*/
  writeFileSync(
    path: PathLike | number,
    data: any,
    options?: WriteFileOptions
  ): void;

  ///**
  //* Asynchronously append data to a file, creating the file if it does not exist.
  //* @param file A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //* If a file descriptor is provided, the underlying file will _not_ be closed automatically.
  //* @param data The data to write. If something other than a Buffer or Uint8Array is provided, the value is coerced to a string.
  //* @param options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
  //* If `encoding` is not supplied, the default of `'utf8'` is used.
  //* If `mode` is not supplied, the default of `0o666` is used.
  //* If `mode` is a string, it is parsed as an octal integer.
  //* If `flag` is not supplied, the default of `'a'` is used.
  //*/
  //appendFile(file: PathLike | number, data: any, options: WriteFileOptions, callback: NoParamCallback): void;

  ///**
  //* Asynchronously append data to a file, creating the file if it does not exist.
  //* @param file A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //* If a file descriptor is provided, the underlying file will _not_ be closed automatically.
  //* @param data The data to write. If something other than a Buffer or Uint8Array is provided, the value is coerced to a string.
  //*/
  //appendFile(file: PathLike | number, data: any, callback: NoParamCallback): void;

  ///**
  //* Synchronously append data to a file, creating the file if it does not exist.
  //* @param file A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //* If a file descriptor is provided, the underlying file will _not_ be closed automatically.
  //* @param data The data to write. If something other than a Buffer or Uint8Array is provided, the value is coerced to a string.
  //* @param options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
  //* If `encoding` is not supplied, the default of `'utf8'` is used.
  //* If `mode` is not supplied, the default of `0o666` is used.
  //* If `mode` is a string, it is parsed as an octal integer.
  //* If `flag` is not supplied, the default of `'a'` is used.
  //*/
  //appendFileSync(file: PathLike | number, data: any, options?: WriteFileOptions): void;

  ///**
  //* Watch for changes on `filename`. The callback `listener` will be called each time the file is accessed.
  //*/
  //watchFile(filename: PathLike, options: { persistent?: boolean; interval?: number; } | undefined, listener: (curr: Stats, prev: Stats) => void): void;

  ///**
  //* Watch for changes on `filename`. The callback `listener` will be called each time the file is accessed.
  //* @param filename A path to a file or directory. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //*/
  //watchFile(filename: PathLike, listener: (curr: Stats, prev: Stats) => void): void;

  ///**
  //* Stop watching for changes on `filename`.
  //* @param filename A path to a file or directory. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //*/
  //unwatchFile(filename: PathLike, listener?: (curr: Stats, prev: Stats) => void): void;

  ///**
  //* Watch for changes on `filename`, where `filename` is either a file or a directory, returning an `FSWatcher`.
  //* @param filename A path to a file or directory. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //* @param options Either the encoding for the filename provided to the listener, or an object optionally specifying encoding, persistent, and recursive options.
  //* If `encoding` is not supplied, the default of `'utf8'` is used.
  //* If `persistent` is not supplied, the default of `true` is used.
  //* If `recursive` is not supplied, the default of `false` is used.
  //*/
  //watch(
  //  filename: PathLike,
  //  options: { encoding?: BufferEncoding | null, persistent?: boolean, recursive?: boolean } | BufferEncoding | undefined | null,
  //  listener?: (event: string, filename: string) => void,
  //): FSWatcher;

  ///**
  //* Watch for changes on `filename`, where `filename` is either a file or a directory, returning an `FSWatcher`.
  //* @param filename A path to a file or directory. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //* @param options Either the encoding for the filename provided to the listener, or an object optionally specifying encoding, persistent, and recursive options.
  //* If `encoding` is not supplied, the default of `'utf8'` is used.
  //* If `persistent` is not supplied, the default of `true` is used.
  //* If `recursive` is not supplied, the default of `false` is used.
  //*/
  //watch(filename: PathLike, options: { encoding: "buffer", persistent?: boolean, recursive?: boolean } | "buffer", listener?: (event: string, filename: Buffer) => void): FSWatcher;

  ///**
  //* Watch for changes on `filename`, where `filename` is either a file or a directory, returning an `FSWatcher`.
  //* @param filename A path to a file or directory. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //* @param options Either the encoding for the filename provided to the listener, or an object optionally specifying encoding, persistent, and recursive options.
  //* If `encoding` is not supplied, the default of `'utf8'` is used.
  //* If `persistent` is not supplied, the default of `true` is used.
  //* If `recursive` is not supplied, the default of `false` is used.
  //*/
  //watch(
  //  filename: PathLike,
  //  options: { encoding?: string | null, persistent?: boolean, recursive?: boolean } | string | null,
  //  listener?: (event: string, filename: string | Buffer) => void,
  //): FSWatcher;

  ///**
  //* Watch for changes on `filename`, where `filename` is either a file or a directory, returning an `FSWatcher`.
  //* @param filename A path to a file or directory. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //*/
  //watch(filename: PathLike, listener?: (event: string, filename: string) => any): FSWatcher;

  ///**
  //* Asynchronously tests whether or not the given path exists by checking with the file system.
  //* @deprecated
  //* @param path A path to a file or directory. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //*/
  //exists(path: PathLike, callback: (exists: boolean) => void): void;

  ///**
  //* Synchronously tests whether or not the given path exists by checking with the file system.
  //* @param path A path to a file or directory. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //*/
  existsSync(path: PathLike): boolean;

  ///**
  //* Asynchronously tests a user's permissions for the file specified by path.
  //* @param path A path to a file or directory. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //*/
  //access(path: PathLike, mode: number | undefined, callback: NoParamCallback): void;

  ///**
  //* Asynchronously tests a user's permissions for the file specified by path.
  //* @param path A path to a file or directory. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //*/
  //access(path: PathLike, callback: NoParamCallback): void;

  ///**
  //* Synchronously tests a user's permissions for the file specified by path.
  //* @param path A path to a file or directory. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //*/
  //accessSync(path: PathLike, mode?: number): void;

  ///**
  //* Returns a new `ReadStream` object.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //*/
  //createReadStream(path: PathLike, options?: string | {
  //  flags?: string;
  //  encoding?: string;
  //  fd?: number;
  //  mode?: number;
  //  autoClose?: boolean;
  //  /**
  //   * @default false
  //   */
  //  emitClose?: boolean;
  //  start?: number;
  //  end?: number;
  //  highWaterMark?: number;
  //}): ReadStream;

  ///**
  //* Returns a new `WriteStream` object.
  //* @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
  //* URL support is _experimental_.
  //*/
  //createWriteStream(path: PathLike, options?: string | {
  //  flags?: string;
  //  encoding?: string;
  //  fd?: number;
  //  mode?: number;
  //  autoClose?: boolean;
  //  start?: number;
  //  highWaterMark?: number;
  //}): WriteStream;

  ///**
  //* Asynchronous fdatasync(2) - synchronize a file's in-core state with storage device.
  //* @param fd A file descriptor.
  //*/
  //fdatasync(fd: number, callback: NoParamCallback): void;

  ///**
  //* Synchronous fdatasync(2) - synchronize a file's in-core state with storage device.
  //* @param fd A file descriptor.
  //*/
  //fdatasyncSync(fd: number): void;

  ///**
  //* Asynchronously copies src to dest. By default, dest is overwritten if it already exists.
  //* No arguments other than a possible exception are given to the callback function.
  //* Node.js makes no guarantees about the atomicity of the copy operation.
  //* If an error occurs after the destination file has been opened for writing, Node.js will attempt
  //* to remove the destination.
  //* @param src A path to the source file.
  //* @param dest A path to the destination file.
  //*/
  //copyFile(src: PathLike, dest: PathLike, callback: NoParamCallback): void;
  ///**
  //* Asynchronously copies src to dest. By default, dest is overwritten if it already exists.
  //* No arguments other than a possible exception are given to the callback function.
  //* Node.js makes no guarantees about the atomicity of the copy operation.
  //* If an error occurs after the destination file has been opened for writing, Node.js will attempt
  //* to remove the destination.
  //* @param src A path to the source file.
  //* @param dest A path to the destination file.
  //* @param flags An integer that specifies the behavior of the copy operation. The only supported flag is fs.constants.COPYFILE_EXCL, which causes the copy operation to fail if dest already exists.
  //*/
  //copyFile(src: PathLike, dest: PathLike, flags: number, callback: NoParamCallback): void;

  ///**
  //* Synchronously copies src to dest. By default, dest is overwritten if it already exists.
  //* Node.js makes no guarantees about the atomicity of the copy operation.
  //* If an error occurs after the destination file has been opened for writing, Node.js will attempt
  //* to remove the destination.
  //* @param src A path to the source file.
  //* @param dest A path to the destination file.
  //* @param flags An optional integer that specifies the behavior of the copy operation.
  //* The only supported flag is fs.constants.COPYFILE_EXCL, which causes the copy operation to fail if dest already exists.
  //*/
  //copyFileSync(src: PathLike, dest: PathLike, flags?: number): void;

  ///**
  //* Write an array of ArrayBufferViews to the file specified by fd using writev().
  //* position is the offset from the beginning of the file where this data should be written.
  //* It is unsafe to use fs.writev() multiple times on the same file without waiting for the callback. For this scenario, use fs.createWriteStream().
  //* On Linux, positional writes don't work when the file is opened in append mode.
  //* The kernel ignores the position argument and always appends the data to the end of the file.
  //*/
  //writev(
  //  fd: number,
  //  buffers: ArrayBufferView[],
  //  cb: (err: ErrnoException | null, bytesWritten: number, buffers: ArrayBufferView[]) => void
  //): void;
  //writev(
  //  fd: number,
  //  buffers: ArrayBufferView[],
  //  position: number,
  //  cb: (err: ErrnoException | null, bytesWritten: number, buffers: ArrayBufferView[]) => void
  //): void;

  ///**
  //* See `writev`.
  //*/
  //writevSync(fd: number, buffers: ArrayBufferView[], position?: number): number;

  //opendirSync(path: string, options?: OpenDirOptions): Dir;

  //opendir(path: string, cb: (err: ErrnoException | null, dir: Dir) => void): void;
  //opendir(path: string, options: OpenDirOptions, cb: (err: ErrnoException | null, dir: Dir) => void): void;
  //
  promises: Promises;
}

declare var fs: FS;

export = fs;
