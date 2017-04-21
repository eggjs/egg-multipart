'use strict';

const co = require('co');
const path = require('path');

const __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : new P(function(resolve) { resolve(result.value); }).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments)).next());
  });
};

module.exports = app => {
  return class UploadController extends app.Controller {
    async() {
      const ctx = this.ctx;
      return __awaiter(this, void 0, void 0, function* () {
        const stream = yield ctx.getFileStream();
        const name = 'egg-multipart-test/' + process.version + '-' + Date.now() + '-' + path.basename(stream.filename);
        const result = yield ctx.oss.put(name, stream);
        ctx.body = {
          name: result.name,
          url: result.url,
          status: result.res.status,
          fields: stream.fields,
        };
      });
    }
  };
};
