'use strict';

const Readable = require('stream').Readable;
const path = require('path');
const uuid = require('uuid');
const parse = require('co-busboy');
const sendToWormhole = require('stream-wormhole');
const fs = require('fs').promises;
const { createWriteStream } = require('fs');
const bytes = require('humanize-bytes');
const dayjs = require('dayjs');
const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

class EmptyStream extends Readable {
  _read() {
    this.push(null);
  }
}

const HAS_CONSUMED = Symbol('Context#multipartHasConsumed');

function limit(code, message) {
  // throw 413 error
  const err = new Error(message);
  err.code = code;
  err.status = 413;
  throw err;
}

module.exports = {
  /**
   * clean up request tmp files helper
   * @function Context#cleanupRequestFiles
   * @param {Array<String>} [files] - file paths need to clenup, default is `ctx.request.files`.
   */
  async cleanupRequestFiles(files) {
    if (!files || !files.length) {
      files = this.request.files;
    }
    if (Array.isArray(files)) {
      for (const file of files) {
        try {
          await fs.rm(file.filepath, { force: true, recursive: true });
        } catch (err) {
          // warning log
          this.coreLogger.warn('[egg-multipart-cleanupRequestFiles-error] file: %j, error: %s',
            file, err);
        }
      }
    }
  },

  /**
   * save request multipart data and files to `ctx.request`
   * @function Context#saveRequestFiles
   * @param {Object} options
   *  - {String} options.defaultCharset
   *  - {String} options.defaultParamCharset
   *  - {Object} options.limits
   *  - {Function} options.checkFile
   */
  async saveRequestFiles(options = {}) {
    const ctx = this;

    const allowArrayField = ctx.app.config.multipart.allowArrayField;

    let storedir;

    const requestBody = {};
    const requestFiles = [];

    options.autoFields = false;
    const parts = ctx.multipart(options);
    let part;
    do {
      try {
        part = await parts();
      } catch (err) {
        await ctx.cleanupRequestFiles(requestFiles);
        throw err;
      }

      if (!part) break;

      if (part.length) {
        ctx.coreLogger.debug('[egg-multipart:storeMultipart] handle value part: %j', part);
        const fieldnameTruncated = part[2];
        const valueTruncated = part[3];
        if (valueTruncated) {
          await ctx.cleanupRequestFiles(requestFiles);
          limit('Request_fieldSize_limit', 'Reach fieldSize limit');
        }
        if (fieldnameTruncated) {
          await ctx.cleanupRequestFiles(requestFiles);
          limit('Request_fieldNameSize_limit', 'Reach fieldNameSize limit');
        }

        // arrays are busboy fields
        const [ filedName, fieldValue ] = part;
        if (!allowArrayField) {
          requestBody[filedName] = fieldValue;
        } else {
          if (!requestBody[filedName]) {
            requestBody[filedName] = fieldValue;
          } else if (!Array.isArray(requestBody[filedName])) {
            requestBody[filedName] = [ requestBody[filedName], fieldValue ];
          } else {
            requestBody[filedName].push(fieldValue);
          }
        }
        continue;
      }

      // otherwise, it's a stream
      const meta = {
        field: part.fieldname,
        filename: part.filename,
        encoding: part.encoding,
        mime: part.mime,
      };
      // keep same property name as file stream
      // https://github.com/cojs/busboy/blob/master/index.js#L114
      meta.fieldname = meta.field;
      meta.transferEncoding = meta.encoding;
      meta.mimeType = meta.mime;

      ctx.coreLogger.debug('[egg-multipart:storeMultipart] handle stream part: %j', meta);
      // empty part, ignore it
      if (!part.filename) {
        await sendToWormhole(part);
        continue;
      }

      if (!storedir) {
        // ${tmpdir}/YYYY/MM/DD/HH
        storedir = path.join(ctx.app.config.multipart.tmpdir, dayjs().format('YYYY/MM/DD/HH'));
        await fs.mkdir(storedir, { recursive: true });
      }
      const filepath = path.join(storedir, uuid.v4() + path.extname(meta.filename));
      const target = createWriteStream(filepath);
      await pipeline(part, target);
      // https://github.com/mscdex/busboy/blob/master/lib/types/multipart.js#L221
      meta.filepath = filepath;
      requestFiles.push(meta);

      // https://github.com/mscdex/busboy/blob/master/lib/types/multipart.js#L221
      if (part.truncated) {
        await ctx.cleanupRequestFiles(requestFiles);
        limit('Request_fileSize_limit', 'Reach fileSize limit');
      }
    } while (part != null);

    ctx.request.body = requestBody;
    ctx.request.files = requestFiles;
  },

  /**
   * create multipart.parts instance, to get separated files.
   * @function Context#multipart
   * @param {Object} [options] - override default multipart configurations
   *  - {Boolean} options.autoFields
   *  - {String} options.defaultCharset
   *  - {String} options.defaultParamCharset
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

    const multipartConfig = this.app.config.multipart;
    options = extractOptions(options);

    const parseOptions = Object.assign({
      autoFields: multipartConfig.autoFields,
      defCharset: multipartConfig.defaultCharset,
      defParamCharset: multipartConfig.defaultParamCharset,
      checkFile: multipartConfig.checkFile,
    }, options);

    // https://github.com/mscdex/busboy#busboy-methods
    // merge limits
    parseOptions.limits = Object.assign({
      fieldNameSize: multipartConfig.fieldNameSize,
      fieldSize: multipartConfig.fieldSize,
      fields: multipartConfig.fields,
      fileSize: multipartConfig.fileSize,
      files: multipartConfig.files,
    }, options.limits);

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
   * @function Context#getFileStream
   * @param {Object} options
   *  - {Boolean} options.requireFile - required file submit, default is true
   *  - {String} options.defaultCharset
   *  - {String} options.defaultParamCharset
   *  - {Object} options.limits
   *  - {Function} options.checkFile
   * @return {ReadStream} stream
   * @since 1.0.0
   */
  async getFileStream(options = {}) {
    options.autoFields = true;
    const parts = this.multipart(options);
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

    if (stream.truncated) {
      limit('Request_fileSize_limit', 'Request file too large, please check multipart config');
    }

    stream.fields = parts.field;
    stream.once('limit', () => {
      const err = new Error('Request file too large, please check multipart config');
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
        stream.on('error', () => { });
      }
      // ignore all data
      stream.resume();
    });
    return stream;
  },
};

function extractOptions(options = {}) {
  const opts = {};
  if (typeof options.autoFields === 'boolean') opts.autoFields = options.autoFields;
  if (options.limits) opts.limits = options.limits;
  if (options.checkFile) opts.checkFile = options.checkFile;

  if (options.defCharset) opts.defCharset = options.defCharset;
  if (options.defParamCharset) opts.defParamCharset = options.defParamCharset;
  // compatible with config names
  if (options.defaultCharset) opts.defCharset = options.defaultCharset;
  if (options.defaultParamCharset) opts.defParamCharset = options.defaultParamCharset;

  // limits
  if (options.limits) {
    opts.limits = Object.assign({}, options.limits);
    for (const key in opts.limits) {
      if (key.endsWith('Size')) {
        opts.limits[key] = bytes(opts.limits[key]);
      }
    }
  }

  return opts;
}
