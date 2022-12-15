#include <emscripten.h>

#include "libavformat/avformat.h"
#include "libavutil/avutil.h"

EM_JS(int, avjs_read_async, (void *h, uint8_t *buf, int buf_size), {
    return Asyncify.handleAsync(function() {
        return avjs_read(h, buf, buf_size);
    });
});

int avjs_read_wrapper(void *h, uint8_t *buf, int buf_size)
{
    return avjs_read_async(h, buf, buf_size);
}

int avjs_open_input(void *handle, uint32_t buf_size, AVFormatContext *fmt_ctx, AVInputFormat *fmt, AVDictionary **options)
{
    uint8_t *buf = NULL;
    AVIOContext *io_ctx = NULL;
    int err = 0;

    buf = av_malloc(buf_size);
    if (buf == NULL)
    {
        err = AVERROR(ENOMEM);
        goto cleanup;
    }
    io_ctx = avio_alloc_context(buf, buf_size, 0, handle, avjs_read_wrapper, NULL, NULL);
    if (io_ctx == NULL)
    {
        err = AVERROR(ENOMEM);
        goto cleanup;
    }
    fmt_ctx->pb = io_ctx;
    err = avformat_open_input(&fmt_ctx, NULL, fmt, options);
    if (err < 0)
    {
        goto cleanup;
    }
    return err;

cleanup:
    if (fmt_ctx != NULL)
    {
        avformat_free_context(fmt_ctx);
    }
    if (io_ctx != NULL)
    {
        avio_context_free(&io_ctx);
    }
    if (buf != NULL)
    {
        av_freep(&buf);
    }

    return err;
}

void avjs_close_input(AVFormatContext *fmt_ctx)
{
    AVIOContext *io_ctx = fmt_ctx->pb;
    uint8_t *buf = io_ctx->buffer;

    avformat_close_input(&fmt_ctx);
    avio_context_free(&io_ctx);
    av_free(buf);
}

// clang-format off
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
B(int, sample_rate)
#undef B

int AVCodecParameters_channels(AVCodecParameters *p) {
    return p->ch_layout.nb_channels;
}

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
B(const struct AVOutputFormat *, oformat)
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

// clang-format on

int AVStream_time_base_num(AVStream *a)
{
    return a->time_base.num;
}

int AVStream_time_base_den(AVStream *a)
{
    return a->time_base.den;
}