const NULLPTR = 0 as typeof LibAV.NULLPTR;

declare const Module: LibAV.LibAVModule;

Module.ff_open_streams = [];

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
	return Promise.resolve(LibAV.AVError.EOF);
};

function streamReader(
	reader: ReadableStreamDefaultReader<ArrayBufferView>
): (buf: Uint8Array) => Promise<number> {
	let remainingBuffer: Uint8Array | null = null;
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
				).slice(),
			];
		}
		return [size, null];
	}
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
			let size;
			[size, remainingBuffer] = copy(destBuf.subarray(copied), sourceBuf);
			copied += size;
		}
		return copied;
	};
}

Module.avformat_open_input_stream = function (
	inputStream: ReadableStream<ArrayBufferView>,
	fmt: LibAV.AVInputFormatPtr = NULLPTR,
	options: LibAV.AVDictionaryPtr = NULLPTR
): Promise<LibAV.AVFormatContextPtr> {
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
				return LibAV.AVError.EOF;
			});
	} catch {
		read = streamReader(inputStream.getReader());
	}
	Module.ff_open_streams[handle] = (buf) =>
		read(buf).catch((err) => {
			console.error(err);
			return LibAV.AVError.EOF;
		});
	return ccall(
		"avformat_open_input_js",
		"number",
		["number", "number", "number"],
		[handle, fmt, options],
		{ async: true }
	) as Promise<LibAV.AVFormatContextPtr>;
};

Module.av_packet_alloc = cwrap(
	"av_packet_alloc",
	"number",
	[]
) as () => LibAV.AVPacketPtr;
Module.av_read_frame = cwrap("av_read_frame", "number", ["number", "number"], {
	async: true,
}) as (ctx, packet) => Promise<LibAV.AVPacketPtr>;
