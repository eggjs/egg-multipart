'use strict';

const path = require('path');
const { Controller } = require('egg');

module.exports = class UploadController extends Controller {
  async index() {
    const parts = this.ctx.multipart();
    const fields = {};
    const files = {};

    for await (const part of parts) {
      if (Array.isArray(part)) {
        const [ name, value ] = part;
        fields[name] = value;
      } else {
        const { filename, fieldname } = part;
        console.log('###', part.truncated)
        let content = '';
        for await(const chunk of part) {
          content += chunk.toString();
        }
        files[fieldname] = {
          fileName: filename,
          content,
        }
      }
    }

    this.ctx.body = { fields, files };
  }
};
