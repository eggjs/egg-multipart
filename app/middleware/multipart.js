'use strict';

const path = require('path');
const fs = require('mz/fs');
const uuid = require('uuid');
const mkdirp = require('mz-modules/mkdirp');
const pump = require('mz-modules/pump');
const sendToWormhole = require('stream-wormhole');
const moment = require('moment');

module.exports = options => {
  async function limit(code, message) {
    // throw 413 error
    const err = new Error(message);
    err.code = code;
    err.status = 413;
    throw err;
  }

  return async function multipart(ctx, next) {
    if (!ctx.is('multipart')) return next();

    let storedir;

    const requestBody = {};
    const requestFiles = [];

    const parts = ctx.multipart({ autoFields: false });
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
          return await limit('Request_fieldSize_limit', 'Reach fieldSize limit');
        }
        if (fieldnameTruncated) {
          await ctx.cleanupRequestFiles(requestFiles);
          return await limit('Request_fieldNameSize_limit', 'Reach fieldNameSize limit');
        }

        // arrays are busboy fields
        requestBody[part[0]] = part[1];
        continue;
      }

      // otherwise, it's a stream
      const meta = {
        field: part.fieldname,
        filename: part.filename,
        encoding: part.encoding,
        mime: part.mime,
      };
      ctx.coreLogger.debug('[egg-multipart:storeMultipart] handle stream part: %j', meta);
      // empty part, ignore it
      if (!part.filename) {
        await sendToWormhole(part);
        continue;
      }

      if (!storedir) {
        // ${tmpdir}/YYYY/MM/DD/HH
        storedir = path.join(options.tmpdir, moment().format('YYYY/MM/DD/HH'));
        const exists = await fs.exists(storedir);
        if (!exists) {
          await mkdirp(storedir);
        }
      }
      const filepath = path.join(storedir, uuid.v4() + path.extname(meta.filename));
      const target = fs.createWriteStream(filepath);
      await pump(part, target);
      // https://github.com/mscdex/busboy/blob/master/lib/types/multipart.js#L221
      meta.filepath = filepath;
      requestFiles.push(meta);

      // https://github.com/mscdex/busboy/blob/master/lib/types/multipart.js#L221
      if (part.truncated) {
        await ctx.cleanupRequestFiles(requestFiles);
        return await limit('Request_fileSize_limit', 'Reach fileSize limit');
      }
    } while (part != null);

    ctx.request.body = requestBody;
    ctx.request.files = requestFiles;
    return next();
  };
};
