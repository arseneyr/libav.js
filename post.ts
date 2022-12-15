const NULLPTR = 0 as typeof LibAV.NULLPTR;

interface PrivateExports {
  _avformat_alloc_context(): LibAV.AVFormatContextPtr;
  _avjs_close_input(ctx: LibAV.AVFormatContextPtr): void;

  _AVStream_time_base_num(stream: LibAV.AVStreamPtr): number;
  _AVStream_time_base_den(stream: LibAV.AVStreamPtr): number;
}

declare const Module: LibAV.LibAVModule & PrivateExports;

interface StreamReader {
  read(buf: Uint8Array): Promise<number>;
  close(): Promise<void>;
}

const ff_open_streams: Record<LibAV.AVFormatContextPtr, StreamReader> = [];

function avjs_read(
  handle: number,
  buf: number,
  buf_size: number
): Promise<number> {
  const stream = ff_open_streams[handle as LibAV.AVFormatContextPtr];
  if (stream) {
    return stream.read(Module.HEAPU8.subarray(buf, buf + buf_size));
  }
  return Promise.resolve(LibAV.AVError.EOF);
}

function defaultStreamReader(
  reader: ReadableStreamDefaultReader<ArrayBufferView>
): (buf: Uint8Array) => Promise<number> {
  let remainingBuffer: Uint8Array | null = null;
  return async (destBuf: Uint8Array) => {
    let copied = 0;
    while (copied < destBuf.byteLength) {
      try {
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
      } catch {
        return LibAV.AVError.EOF;
      }
    }
    return copied;
  };
}

function byobStreamReader(
  reader: ReadableStreamBYOBReader
): StreamReader["read"] {
  return async (destBuf) => {
    let copied = 0;
    while (copied < destBuf.byteLength) {
      try {
        const { value, done } = await reader.read(destBuf.subarray(copied));
        if (value) {
          copied += value.byteLength;
          if (done) {
            break;
          }
        } else {
          return LibAV.AVError.EOF;
        }
      } catch {
        return LibAV.AVError.EOF;
      }
    }
    return copied;
  };
}

function createStreamReader(
  stream: ReadableStream<ArrayBufferView>
): StreamReader {
  let reader:
    | ReadableStreamBYOBReader
    | ReadableStreamDefaultReader<ArrayBufferView>;
  let read: StreamReader["read"];
  try {
    reader = stream.getReader({ mode: "byob" });
    read = byobStreamReader(reader);
  } catch {
    reader = stream.getReader();
    read = defaultStreamReader(reader);
  }

  return {
    read,
    close() {
      return reader.cancel();
    },
  };
}

const avjs_open_input = cwrap(
  "avjs_open_input",
  "number",
  ["number", "number", "number", "number", "number"],
  { async: true }
) as unknown as (
  handle: number,
  buf_size: number,
  fmx_ctx: LibAV.AVFormatContextPtr,
  fmt: LibAV.AVInputFormatPtr,
  options: LibAV.AVDictionaryPtr
) => Promise<number>;

Module.avformat_open_input_stream = function (
  inputStream: ReadableStream<ArrayBufferView>,
  fmt: LibAV.AVInputFormatPtr = NULLPTR,
  options: LibAV.AVDictionaryPtr = NULLPTR
): Promise<LibAV.AVFormatContextPtr> {
  const fmt_ctx = Module._avformat_alloc_context();
  if (!fmt_ctx) {
    return Promise.reject(Error("avformat allocation failure"));
  }
  const reader = createStreamReader(inputStream);
  ff_open_streams[fmt_ctx] = reader;
  return avjs_open_input(fmt_ctx, 4096, fmt_ctx, fmt, options).then((r) => {
    if (r < 0) {
      reader.close();
      delete ff_open_streams[fmt_ctx];
      throw new Error("avformat_open_input_stream error: " + r);
    }
    return fmt_ctx;
  });
};

Module.avformat_close_input = async function (fmt: LibAV.AVFormatContextPtr) {
  await ff_open_streams[fmt]?.close();
  delete ff_open_streams[fmt];
  Module._avjs_close_input(fmt);
};

Module.av_packet_alloc = cwrap(
  "av_packet_alloc",
  "number",
  []
) as LibAV.LibAVModule["av_packet_alloc"];
Module.av_read_frame = cwrap("av_read_frame", "number", ["number", "number"], {
  async: true,
}) as LibAV.LibAVModule["av_read_frame"];

Module.AVPacket_data = cwrap("AVPacket_data", "number", ["number"]);
Module.AVPacket_size = cwrap("AVPacket_size", "number", ["number"]);
Module.AVPacket_duration = cwrap("AVPacket_duration", "number", ["number"]);
Module.AVPacket_pts = cwrap("AVPacket_pts", "number", ["number"]);
Module.AVPacket_stream_index = cwrap("AVPacket_stream_index", "number", [
  "number",
]);

Module.AVFormatContext_nb_streams = cwrap(
  "AVFormatContext_nb_streams",
  "number",
  ["number"]
);
Module.AVFormatContext_streams_a = cwrap(
  "AVFormatContext_streams_a",
  "number",
  ["number", "number"]
) as unknown as LibAV.LibAVModule["AVFormatContext_streams_a"];

Module.AVStream_time_base = function (stream: LibAV.AVStreamPtr) {
  return {
    num: Module._AVStream_time_base_num(stream),
    den: Module._AVStream_time_base_den(stream),
  };
};
Module.AVStream_codecpar = cwrap("AVStream_codecpar", "number", [
  "number",
]) as unknown as LibAV.LibAVModule["AVStream_codecpar"];

Module.AVCodecParameters_channels = cwrap(
  "AVCodecParameters_channels",
  "number",
  ["number"]
) as LibAV.LibAVModule["AVCodecParameters_channels"];

Module.AVCodecParameters_sample_rate = cwrap(
  "AVCodecParameters_sample_rate",
  "number",
  ["number"]
) as LibAV.LibAVModule["AVCodecParameters_sample_rate"];
