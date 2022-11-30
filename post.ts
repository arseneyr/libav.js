const NULLPTR = 0 as typeof LibAV.NULLPTR;

declare const Module: LibAV.LibAVModule;

const ff_open_streams: Record<
  LibAV.AVFormatContextPtr,
  (buf: Uint8Array) => Promise<number>
> = [];

function libavjs_read(
  handle: number,
  buf: number,
  buf_size: number
): Promise<number> {
  const stream = ff_open_streams[handle as LibAV.AVFormatContextPtr];
  if (stream) {
    return stream(Module.HEAPU8.subarray(buf, buf + buf_size));
  }
  return Promise.resolve(LibAV.AVError.EOF);
}

function streamReader(
  reader: ReadableStreamDefaultReader<ArrayBufferView>
): (buf: Uint8Array) => Promise<number> {
  let remainingBuffer: Uint8Array | null = null;
  return async (destBuf: Uint8Array) => {
    let copied = 0;
    while (copied < destBuf.byteLength) {
      const sourceBuf = remainingBuffer ?? (await reader.read()).value;
      if (!sourceBuf) {
        if (copied === 0) {
          return LibAV.AVError.EOF;
        }
        break;
      }
      const destSubBuf = destBuf.subarray(copied);
      const size = Math.min(sourceBuf.byteLength, destSubBuf.byteLength);
      destSubBuf.set(
        new Uint8Array(sourceBuf.buffer, sourceBuf.byteOffset, size)
      );
      if (size < sourceBuf.byteLength) {
        remainingBuffer = new Uint8Array(
          sourceBuf.buffer,
          sourceBuf.byteOffset + size,
          sourceBuf.byteLength - size
        );
      } else {
        remainingBuffer = null;
      }
      copied += size;
    }
    return copied;
  };
}

const avformat_open_input_js = cwrap(
  "avformat_open_input_js",
  "number",
  ["number", "number", "number", "number"],
  { async: true }
) as (
  handle: number,
  opt_fmx_ctx: LibAV.AVFormatContextPtr,
  fmt: LibAV.AVInputFormatPtr,
  options: LibAV.AVDictionaryPtr
) => Promise<LibAV.AVFormatContextPtr>;

Module.avformat_open_input_stream = function (
  inputStream: ReadableStream<ArrayBufferView>,
  fmt: LibAV.AVInputFormatPtr = NULLPTR,
  options: LibAV.AVDictionaryPtr = NULLPTR
): Promise<LibAV.AVFormatContextPtr> {
  let read: (buf: Uint8Array) => Promise<number>;
  let reader:
    | ReadableStreamBYOBReader
    | ReadableStreamDefaultReader<ArrayBufferView>;
  try {
    reader = inputStream.getReader({ mode: "byob" });
    read = (buf) =>
      reader.read(buf).then(({ value }) => {
        if (value) {
          return value.byteLength;
        }
        return LibAV.AVError.EOF;
      });
  } catch {
    reader = inputStream.getReader();
    read = streamReader(reader);
  }
  const fmt_ctx = Module._avformat_alloc_context();
  if (!fmt_ctx) {
    return Promise.reject(Error("allocation failure"));
  }
  ff_open_streams[fmt_ctx] = (buf) =>
    read(buf).catch((err) => {
      console.error(err);
      return LibAV.AVError.EOF;
    });
  return avformat_open_input_js(fmt_ctx, fmt_ctx, fmt, options).then((r) => {
    if (!r) {
      reader.cancel();
      delete ff_open_streams[fmt_ctx];
    }
    return r;
  });
};

Module.av_packet_alloc = cwrap(
  "av_packet_alloc",
  "number",
  []
) as () => LibAV.AVPacketPtr;
Module.av_read_frame = cwrap("av_read_frame", "number", ["number", "number"], {
  async: true,
}) as (ctx, packet) => Promise<LibAV.AVPacketPtr>;

Module.AVPacket_data = cwrap("AVPacket_data", "number", ["number"]);
Module.AVPacket_size = cwrap("AVPacket_size", "number", ["number"]);
