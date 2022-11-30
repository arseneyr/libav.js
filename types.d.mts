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

  _avformat_alloc_context(): AVFormatContextPtr;

  av_packet_alloc(): AVPacketPtr;
  av_read_frame(ctx: AVFormatContextPtr, packet: AVPacketPtr): Promise<number>;
  AVPacket_data(packet: AVPacketPtr): number;
  AVPacket_size(packet: AVPacketPtr): number;
  av_packet_unref(packet: AVPacketPtr): void;
}
export const enum AVError {
  EOF = -541478725,
}
export declare const NULLPTR: number & { __brand: any };
declare const factory: EmscriptenModuleFactory<LibAVModule>;
export default factory;
