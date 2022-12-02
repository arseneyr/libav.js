#include <emscripten.h>

#include "libavformat/avformat.h"
#include "libavutil/avutil.h"

EM_JS(int, libavjs_read_async, (void *h, uint8_t *buf, int buf_size), {
    return Asyncify.handleAsync(function () {
        return libavjs_read(h, buf, buf_size);
    });
});

AVFormatContext *avformat_open_input_js(void *handle, AVFormatContext *opt_fmt_ctx, AVInputFormat *fmt, AVDictionary **options)
{
    uint8_t *buf = av_malloc(4096);
    if (buf == NULL) {
        return NULL;
    }
    AVIOContext *io_ctx = avio_alloc_context(buf, 4096, 0, handle, libavjs_read_async, NULL, NULL);
    if (io_ctx == NULL) {
        av_free(buf);
        return NULL;
    }
    AVFormatContext *fmt_ctx = opt_fmt_ctx != NULL ? opt_fmt_ctx : avformat_alloc_context();
    if (fmt_ctx == NULL) {
        avio_context_free(&io_ctx);
        return NULL;
    }
    fmt_ctx->pb = io_ctx;
    int err = avformat_open_input(&fmt_ctx, NULL, fmt, options);
    if (err < 0) {
        return NULL;
    }
    return fmt_ctx;
}

#define A(struc, type, field) \
    type struc ## _ ## field(struc *a) { return a->field; } \
    void struc ## _ ## field ## _s(struc *a, type b) { a->field = b; }

#define AL(struc, type, field) \
    uint32_t struc ## _ ## field(struc *a) { return (uint32_t) a->field; } \
    uint32_t struc ## _ ## field ## hi(struc *a) { return (uint32_t) (a->field >> 32); } \
    void struc ## _ ## field ## _s(struc *a, uint32_t b) { a->field = b; } \
    void struc ## _ ## field ## hi_s(struc *a, uint32_t b) { a->field |= (((type) b) << 32); }

#define AA(struc, type, field) \
    type struc ## _ ## field ## _a(struc *a, size_t c) { return a->field[c]; } \
    void struc ## _ ## field ## _a_s(struc *a, size_t c, type b) { a->field[c] = b; }

/* AVCodecParameters */
#define B(type, field) A(AVCodecParameters, type, field)
B(enum AVCodecID, codec_id)
B(enum AVMediaType, codec_type)
B(uint8_t *, extradata)
B(int, extradata_size)
B(int, format)
B(int64_t, bit_rate)
B(int, profile)
B(int, level)
B(int, width)
B(int, height)
B(enum AVColorRange, color_range)
B(enum AVColorPrimaries, color_primaries)
B(enum AVColorTransferCharacteristic, color_trc)
B(enum AVColorSpace, color_space)
B(enum AVChromaLocation, chroma_location)
B(int, channels)
B(int, sample_rate)
#undef B

/* AVPacket */
#define B(type, field) A(AVPacket, type, field)
#define BL(type, field) AL(AVPacket, type, field)
B(uint8_t *, data)
BL(int64_t, dts)
BL(int64_t, duration)
B(int, flags)
BL(int64_t, pts)
B(AVPacketSideData *, side_data)
B(int, side_data_elems)
B(int, size)
B(int, stream_index)
#undef B
#undef BL

/* AVFormatContext */
#define B(type, field) A(AVFormatContext, type, field)
#define BA(type, field) AA(AVFormatContext, type, field)
B(unsigned int, nb_streams)
B(struct AVOutputFormat *, oformat)
B(AVIOContext *, pb)
BA(AVStream *, streams)
#undef B
#undef BA

/* AVStream */
#define B(type, field) A(AVStream, type, field)
#define BL(type, field) AL(AVStream, type, field)
B(AVCodecParameters *, codecpar)
BL(int64_t, duration)
#undef B
#undef BL

int AVStream_time_base_num(AVStream *a) {
    return a->time_base.num;
}

int AVStream_time_base_den(AVStream *a) {
    return a->time_base.den;
}