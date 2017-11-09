'use strict';

const co = require('co');
const path = require('path');

module.exports = app => {
  return class UploadController extends app.Controller {
    async async() {
      const ctx = this.ctx;
      const stream = await ctx.getFileStream();
      const name = 'egg-multipart-test/' + process.version + '-' + Date.now() + '-' + path.basename(stream.filename);
      const result = await ctx.oss.put(name, stream);
      ctx.body = {
        name: result.name,
        url: result.url,
        status: result.res.status,
        fields: stream.fields,
      };
    }
  };
};
