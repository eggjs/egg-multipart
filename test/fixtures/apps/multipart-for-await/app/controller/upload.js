'use strict';

const path = require('path');
const { Controller } = require('egg');
const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

module.exports = class UploadController extends Controller {
  async index() {
    const parts = this.ctx.multipart();
    const fields = {};
    const files = {};

    const shouldMockError = !!this.ctx.query.mock_error;

    for await (const part of parts) {
      if (Array.isArray(part)) {
        const [ name, value ] = part;
        fields[name] = value;
      } else {
        const { filename, fieldname } = part;

        let content = '';
        await pipeline(part,
          new stream.Writable({
            write(chunk, encding, callback) {
              content += chunk.toString();
              if (shouldMockError) {
                return callback(new Error('mock error'));
              }
              setImmediate(callback);
            },
          }),
        );

        files[fieldname] = {
          fileName: filename,
          content,
        }
      }
    }

    this.ctx.body = { fields, files };
  }
};
