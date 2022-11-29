#include <emscripten.h>

#include "libavformat/avformat.h"
#include "libavutil/avutil.h"

EM_JS(int, libavjs_read_async, (void *h, uint8_t *buf, int buf_size), {
    return Asyncify.handleAsync(function () {
        return Module.libavjs_read(h, buf, buf_size);
    });
});

AVFormatContext *avformat_open_input_js(void* handle, AVInputFormat *fmt, AVDictionary **options)
{
    uint8_t *buf = av_malloc(4096);
    if (buf == NULL)
        return NULL;
    AVIOContext *io_ctx = avio_alloc_context(buf, 4096, 0, handle, libavjs_read_async, NULL, NULL);
    if (io_ctx == NULL) {
        av_free(buf);
        return NULL;
    }
    AVFormatContext *fmt_ctx = avformat_alloc_context();
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