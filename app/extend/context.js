'use strict';

const assert = require('assert');
const path = require('path');
const { randomUUID } = require('crypto');
const parse = require('co-busboy');
const fs = require('fs').promises;
const { createWriteStream } = require('fs');
const bytes = require('humanize-bytes');
const dayjs = require('dayjs');
const stream = require('stream');
const { Readable, PassThrough } = stream;
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

class LimitError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.status = 413;
  }
}

const HAS_CONSUMED = Symbol('Context#multipartHasConsumed');

module.exports = {
  /**
   * create multipart.parts instance, to get separated files.
   * @function Context#multipart
   * @param {Object} [options] - override default multipart configurations
   *  - {Boolean} options.autoFields
   *  - {String} options.defaultCharset
   *  - {String} options.defaultParamCharset
   *  - {Object} options.limits
   *  - {Function} options.checkFile
   * @return {Yieldable | AsyncIterable<Yieldable>} parts
   */
  multipart(options) {
    const ctx = this;
    // multipart/form-data
    if (!ctx.is('multipart')) ctx.throw(400, 'Content-Type must be multipart/*');

    assert(!ctx[HAS_CONSUMED], 'the multipart request can\'t be consumed twice');
    ctx[HAS_CONSUMED] = true;

    const { autoFields, defaultCharset, defaultParamCharset, checkFile } = ctx.app.config.multipart;
    const { fieldNameSize, fieldSize, fields, fileSize, files } = ctx.app.config.multipart;
    options = extractOptions(options);

    const parseOptions = Object.assign({
      autoFields,
      defCharset: defaultCharset,
      defParamCharset: defaultParamCharset,
      checkFile,
    }, options);

    // https://github.com/mscdex/busboy#busboy-methods
    // merge limits
    parseOptions.limits = Object.assign({
      fieldNameSize,
      fieldSize,
      fields,
      fileSize,
      files,
    }, options.limits);

    // mount asyncIterator, so we can use `for await` to get parts
    const parts = parse(this, parseOptions);
    parts[Symbol.asyncIterator] = async function* () {
      let part;
      do {
        part = await parts();

        if (!part) continue;

        if (Array.isArray(part)) {
          if (part[3]) throw new LimitError('Request_fieldSize_limit', 'Reach fieldSize limit');
          // TODO: still not support at busboy 1.x (only support at urlencoded)
          // https://github.com/mscdex/busboy/blob/v0.3.1/lib/types/multipart.js#L5
          // https://github.com/mscdex/busboy/blob/master/lib/types/multipart.js#L251
          // if (part[2]) throw new LimitError('Request_fieldNameSize_limit', 'Reach fieldNameSize limit');
        } else {
          // user click `upload` before choose a file, `part` will be file stream, but `part.filename` is empty must handler this, such as log error.
          if (!part.filename) {
            ctx.coreLogger.debug('[egg-multipart] file field `%s` is upload without file stream, will drop it.', part.fieldname);
            await pipeline(part, new PassThrough());
            continue;
          }
          // TODO: check whether filename is malicious input

          // busboy only set truncated when consume the stream
          if (part.truncated) {
            // in case of emit 'limit' too fast
            throw new LimitError('Request_fileSize_limit', 'Reach fileSize limit');
          } else {
            part.once('limit', function() {
              this.emit('error', new LimitError('Request_fileSize_limit', 'Reach fileSize limit'));
              this.resume();
            });
          }
        }

        // dispatch part to outter logic such as for-await-of
        yield part;

      } while (part !== undefined);
    };
    return parts;
  },

  /**
   * save request multipart data and files to `ctx.request`
   * @function Context#saveRequestFiles
   * @param {Object} options - { limits, checkFile, ... }
   */
  async saveRequestFiles(options = {}) {
    const ctx = this;

    const allowArrayField = ctx.app.config.multipart.allowArrayField;

    let storedir;

    const requestBody = {};
    const requestFiles = [];

    options.autoFields = false;
    const parts = ctx.multipart(options);

    try {
      for await (const part of parts) {
        if (Array.isArray(part)) {
          // fields
          const [ fieldName, fieldValue ] = part;
          if (!allowArrayField) {
            requestBody[fieldName] = fieldValue;
          } else {
            if (!requestBody[fieldName]) {
              requestBody[fieldName] = fieldValue;
            } else if (!Array.isArray(requestBody[fieldName])) {
              requestBody[fieldName] = [ requestBody[fieldName], fieldValue ];
            } else {
              requestBody[fieldName].push(fieldValue);
            }
          }
        } else {
          // stream
          const { filename, fieldname, encoding, mime } = part;

          if (!storedir) {
            // ${tmpdir}/YYYY/MM/DD/HH
            storedir = path.join(ctx.app.config.multipart.tmpdir, dayjs().format('YYYY/MM/DD/HH'));
            await fs.mkdir(storedir, { recursive: true });
          }

          // write to tmp file
          const filepath = path.join(storedir, randomUUID() + path.extname(filename));
          const target = createWriteStream(filepath);
          await pipeline(part, target);

          const meta = {
            filepath,
            field: fieldname,
            filename,
            encoding,
            mime,
            // keep same property name as file stream, https://github.com/cojs/busboy/blob/master/index.js#L114
            fieldname,
            transferEncoding: encoding,
            mimeType: mime,
          };

          requestFiles.push(meta);
        }
      }
    } catch (err) {
      await ctx.cleanupRequestFiles(requestFiles);
      throw err;
    }

    ctx.request.body = requestBody;
    ctx.request.files = requestFiles;
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
      stream = Readable.from([]);
    }

    if (stream.truncated) {
      throw new LimitError('Request_fileSize_limit', 'Request file too large, please check multipart config');
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
          this.coreLogger.warn('[egg-multipart-cleanupRequestFiles-error] file: %j, error: %s', file, err);
        }
      }
    }
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
      if (key.endsWith('Size') && opts.limits[key]) {
        opts.limits[key] = bytes(opts.limits[key]);
      }
    }
  }

  return opts;
}
