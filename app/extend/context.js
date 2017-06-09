'use strict';

const parse = require('co-busboy');
const co = require('co');

module.exports = {
  /**
   * create multipart.parts instance, to get separated files.
   * @method Context#multipart
   * @param {Object} [options] - override default multipart configurations
   * @return {Yieldable} parts
   */
  multipart(options) {
    // multipart/form-data
    if (!this.is('multipart')) {
      this.throw(400, 'Content-Type must be multipart/*');
    }
    const parseOptions = {};
    Object.assign(parseOptions, this.app.config.multipartParseOptions, options);
    return parse(this, parseOptions);
  },

  /**
   * get upload file stream
   * @example
   * ```js
   * const stream = yield this.getFileStream();
   * // get other fields
   * console.log(stream.fields);
   * ```
   * @method Context#getFileStream
   * @return {ReadStream} stream
   * @since 1.0.0
   */
  getFileStream() {
    const ctx = this;
    return co(function* () {
      const parts = ctx.multipart({ autoFields: true });
      const stream = yield parts;
      // stream not exists, treat as an exception
      if (!stream || !stream.filename) {
        ctx.throw(400, 'Can\'t found upload file');
      }
      stream.fields = parts.field;
      stream.once('limit', () => {
        const err = new Error('Request file too large');
        err.name = 'MultipartFileTooLargeError';
        err.status = 413;
        err.fields = stream.fields;
        if (stream.listenerCount('error') > 0) {
          stream.emit('error', err);
          ctx.coreLogger.warn(err);
        } else {
          ctx.coreLogger.error(err);
          // ignore next error event
          stream.on('error', () => {});
        }
        // ignore all data
        stream.resume();
      });
      return stream;
    });
  },
};
