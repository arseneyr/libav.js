
// type AVFormatContextPtr = number & { __brand: "AVFormatContextPtr" };
// type AVInputFormatPtr = number & { __brand: "AVInputFormatPtr" };
// type AVDictionaryPtr = number & { __brand: "AVDictionaryPtr" };
// type AVPacketPtr = number & { __brand: "AVPacketPtr" };

const NULLPTR = 0 as number & { __brand: any };

// interface LibAVModule extends EmscriptenModule {
// 	avformat_open_input_stream(
// 		inputStream: ReadableStream<ArrayBufferView>,
// 		fmt?: AVInputFormatPtr,
// 		options?: AVDictionaryPtr
// 	): Promise<AVFormatContextPtr>;
// 	av_packet_alloc(): AVPacketPtr;
// 	av_read_frame(ctx: AVFormatContextPtr, packet: AVPacketPtr): Promise<number>;

// 	ff_open_streams: ((buf: Uint8Array) => Promise<number>)[];
// 	libavjs_read(handle: number, buf: number, buf_size: number): Promise<number>;
// }


declare const Module: LibAV.LibAVModule;

Module.ff_open_streams = [];

const AVERROR_EOF = -0x20464f45;

Module.libavjs_read = function (
	handle: number,
	buf: number,
	buf_size: number
): Promise<number> {
	console.log(arguments);
	const stream = Module.ff_open_streams[handle];
	if (stream) {
		return stream(Module.HEAPU8.subarray(buf, buf + buf_size));
	}
	return Promise.resolve(AVERROR_EOF);
};

function streamReader(
	reader: ReadableStreamDefaultReader<ArrayBufferView>
): (buf: Uint8Array) => Promise<number> {
	let pendingBuffer: Uint8Array | null = null;
	function copy(
		dest: Uint8Array,
		source: ArrayBufferView
	): [number, Uint8Array | null] {
		const size = Math.min(dest.byteLength, source.byteLength);
		dest.set(new Uint8Array(source.buffer, source.byteOffset, size));
		if (size < source.byteLength) {
			return [
				size,
				new Uint8Array(
					source.buffer,
					source.byteOffset + size,
					source.byteLength - size
				),
			];
		}
		return [size, null];
	}
	return (buf) => {
		if (pendingBuffer) {
			let size;
			[size, pendingBuffer] = copy(buf, pendingBuffer);
			return Promise.resolve(size);
		}
		return reader.read().then(({ value }) => {
			if (!value) {
				return AVERROR_EOF;
			}
			let size;
			[size, pendingBuffer] = copy(buf, value);
			return size;
		});
	};
}

Module.avformat_open_input_stream = function (
	inputStream: ReadableStream<ArrayBufferView>,
	fmt: AVInputFormatPtr = NULLPTR,
	options: AVDictionaryPtr = NULLPTR
): Promise<AVFormatContextPtr> {
	let handle = 1;
	for (; Module.ff_open_streams[handle] !== undefined; ++handle);
	let read: (buf: Uint8Array) => Promise<number>;
	try {
		const reader = inputStream.getReader({ mode: "byob" });
		read = (buf) =>
			reader.read(buf).then(({ value }) => {
				if (value) {
					return value.byteLength;
				}
				return AVERROR_EOF;
			});
	} catch {
		read = streamReader(inputStream.getReader());
	}
	Module.ff_open_streams[handle] = (buf) =>
		read(buf).catch((err) => {
			console.error(err);
			return AVERROR_EOF;
		});
	return ccall(
		"avformat_open_input_js",
		"number",
		["number", "number", "number"],
		[handle, fmt, options],
		{ async: true }
	) as Promise<AVFormatContextPtr>;
};

Module.av_packet_alloc = cwrap(
	"av_packet_alloc",
	"number",
	[]
) as () => AVPacketPtr;
Module.av_read_frame = cwrap("av_read_frame", "number", ["number", "number"], {
	async: true,
}) as (ctx, packet) => Promise<AVPacketPtr>;

// export type { Module };
