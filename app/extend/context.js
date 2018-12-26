'use strict';

const rimraf = require('mz-modules/rimraf');
const parse = require('co-busboy');
const Readable = require('stream').Readable;

class EmptyStream extends Readable {
  _read() {
    this.push(null);
  }
}

const HAS_CONSUMED = Symbol('Context#multipartHasConsumed');

module.exports = {
  /**
   * clean up request tmp files helper
   * @method Context#cleanupRequestFiles
   * @param {Array<String>} [files] - file paths need to clenup, default is `ctx.request.files`.
   */
  async cleanupRequestFiles(files) {
    if (!files || !files.length) {
      files = this.request.files;
    }
    if (Array.isArray(files)) {
      for (const file of files) {
        try {
          await rimraf(file.filepath);
        } catch (err) {
          // warning log
          this.coreLogger.warn('[egg-multipart-cleanupRequestFiles-error] file: %j, error: %s',
            file, err);
        }
      }
    }
  },

  /**
   * create multipart.parts instance, to get separated files.
   * @method Context#multipart
   * @param {Object} [options] - override default multipart configurations
   *  - {Boolean} options.autoFields
   *  - {String} options.defCharset
   *  - {Object} options.limits
   *  - {Function} options.checkFile
   * @return {Yieldable} parts
   */
  multipart(options) {
    // multipart/form-data
    if (!this.is('multipart')) {
      this.throw(400, 'Content-Type must be multipart/*');
    }
    if (this[HAS_CONSUMED]) throw new TypeError('the multipart request can\'t be consumed twice');

    this[HAS_CONSUMED] = true;
    const parseOptions = Object.assign({}, this.app.config.multipartParseOptions);
    options = options || {};
    if (typeof options.autoFields === 'boolean') parseOptions.autoFields = options.autoFields;
    if (options.defCharset) parseOptions.defCharset = options.defCharset;
    if (options.checkFile) parseOptions.checkFile = options.checkFile;
    // merge and create a new limits object
    if (options.limits) parseOptions.limits = Object.assign({}, parseOptions.limits, options.limits);
    return parse(this, parseOptions);
  },

  /**
   * get upload file stream
   * @example
   * ```js
   * const stream = await ctx.getFileStream();
   * // get other fields
   * console.log(stream.fields);
   * ```
   * @method Context#getFileStream
   * @param {Object} options
   *  - {Boolean} options.requireFile - required file submit, default is true
   *  - {String} options.defCharset
   *  - {Object} options.limits
   *  - {Function} options.checkFile
   * @return {ReadStream} stream
   * @since 1.0.0
   */
  async getFileStream(options) {
    options = options || {};
    const multipartOptions = {
      autoFields: true,
    };
    if (options.defCharset) multipartOptions.defCharset = options.defCharset;
    if (options.limits) multipartOptions.limits = options.limits;
    if (options.checkFile) multipartOptions.checkFile = options.checkFile;
    const parts = this.multipart(multipartOptions);
    let stream = await parts();

    if (options.requireFile !== false) {
      // stream not exists, treat as an exception
      if (!stream || !stream.filename) {
        this.throw(400, 'Can\'t found upload file');
      }
    }

    if (!stream) {
      stream = new EmptyStream();
    }
    stream.fields = parts.field;
    stream.once('limit', () => {
      const err = new Error('Request file too large');
      err.name = 'MultipartFileTooLargeError';
      err.status = 413;
      err.fields = stream.fields;
      err.filename = stream.filename;
      if (stream.listenerCount('error') > 0) {
        stream.emit('error', err);
        this.coreLogger.warn(err);
      } else {
        this.coreLogger.error(err);
        // ignore next error event
        stream.on('error', () => {});
      }
      // ignore all data
      stream.resume();
    });
    return stream;
  },
};
