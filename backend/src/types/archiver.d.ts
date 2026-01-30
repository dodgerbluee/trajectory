declare module 'archiver' {
  interface Archiver {
    pipe<T extends NodeJS.WritableStream>(destination: T): T;
    append(source: string | Buffer, options?: { name: string }): this;
    file(path: string, options?: { name: string }): this;
    on(event: 'error', cb: (err: Error) => void): this;
    finalize(): Promise<void>;
  }
  function archiver(format: string, options?: { zlib?: { level?: number } }): Archiver;
  export = archiver;
}
