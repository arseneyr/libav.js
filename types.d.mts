/// <reference types="emscripten" />
export type AVFormatContextPtr = number & {
  __brand: "AVFormatContextPtr";
};
export type AVInputFormatPtr = number & {
  __brand: "AVInputFormatPtr";
};
export type AVDictionaryPtr = number & {
  __brand: "AVDictionaryPtr";
};
export type AVPacketPtr = number & {
  __brand: "AVPacketPtr";
};
export interface LibAVModule extends EmscriptenModule {
  avformat_open_input_stream(
    inputStream: ReadableStream<ArrayBufferView>,
    fmt?: AVInputFormatPtr,
    options?: AVDictionaryPtr
  ): Promise<AVFormatContextPtr>;
  av_packet_alloc(): AVPacketPtr;
  av_read_frame(ctx: AVFormatContextPtr, packet: AVPacketPtr): Promise<number>;
  _AVPacket_data(packet: AVPacketPtr): number;
  _AVPacket_size(packet: AVPacketPtr): number;
  _av_packet_unref(packet: AVPacketPtr): void;
  ff_open_streams: ((buf: Uint8Array) => Promise<number>)[];
  libavjs_read(handle: number, buf: number, buf_size: number): Promise<number>;
}
export const enum AVError {
  EOF = -541478725
}
export declare const NULLPTR: number & { __brand: any };
declare const factory: EmscriptenModuleFactory<LibAVModule>;
export default factory;
