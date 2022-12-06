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
export type AVStreamPtr = number & {
  __brand: "AVStreamPtr";
};
export type AVCodecParametersPtr = number & {
  __brand: "AVCodecParametersPtr";
};
export interface LibAVModule extends EmscriptenModule {
  avformat_open_input_stream(
    inputStream: ReadableStream<ArrayBufferView>,
    fmt?: AVInputFormatPtr,
    options?: AVDictionaryPtr
  ): Promise<AVFormatContextPtr>;

  avformat_close_input(fmt: AVFormatContextPtr): Promise<void>;

  av_packet_alloc(): AVPacketPtr;
  av_read_frame(ctx: AVFormatContextPtr, packet: AVPacketPtr): Promise<number>;

  AVPacket_data(packet: AVPacketPtr): number;
  AVPacket_size(packet: AVPacketPtr): number;
  AVPacket_duration(packet: AVPacketPtr): number;
  AVPacket_pts(packet: AVPacketPtr): number;
  AVPacket_stream_index(packet: AVPacketPtr): number;

  av_packet_unref(packet: AVPacketPtr): void;

  AVFormatContext_nb_streams(ctx: AVFormatContextPtr): number;
  AVFormatContext_streams_a(ctx: AVFormatContextPtr, n: number): AVStreamPtr;

  AVStream_time_base(stream: AVStreamPtr): { num: number; den: number };
  AVStream_codecpar(stream: AVStreamPtr): AVCodecParametersPtr;

  AVCodecParameters_sample_rate(params: AVCodecParametersPtr): number;
  AVCodecParameters_channels(params: AVCodecParametersPtr): number;
}
export const enum AVError {
  EOF = -541478725,
  ENOMEM = -9971,
}
export declare const NULLPTR: number & { __brand: any };
declare const factory: EmscriptenModuleFactory<LibAVModule>;
export default factory;
