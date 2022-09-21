'use strict';

const path = require('path');
const is = require('is-type-of');
const fs = require('fs').promises;
const { pipeline } = require('stream').promises;

module.exports = app => {
  // mock oss
  app.context.oss = {
    async put(name, stream) {
      const tmpfile = path.join(app.config.baseDir, 'run', Date.now() + name);
      await fs.mkdir(path.dirname(tmpfile), { recursive: true });
      const writeStream = fs.createWriteStream(tmpfile);
      await pipeline(stream, writeStream);
      return {
        name,
        url: 'http://mockoss.com/' + name,
        res: {
          status: 200,
        },
      };
    },
  };

  app.get('/', function* () {
    this.body = {
      app: is.object(this.app.oss),
      ctx: is.object(this.oss),
      putBucket: is.generatorFunction(this.oss.putBucket),
    };
  });

  app.get('/uploadtest', function* () {
    const name = 'egg-oss-test-upload-' + process.version + '-' + Date.now();
    this.body = yield this.oss.put(name, fs.createReadStream(__filename));
  });

  app.get('/upload', function* () {
    this.set('x-csrf', this.csrf);
    this.body = 'hi';
    // yield this.render('upload.html');
  });

  app.post('/upload', function* () {
    const stream = yield this.getFileStream();
    const name = 'egg-multipart-test/' + process.version + '-' + Date.now() + '-' + path.basename(stream.filename);
    // 文件处理，上传到云存储等等
    const result = yield this.oss.put(name, stream);
    this.body = {
      name: result.name,
      url: result.url,
      status: result.res.status,
      fields: stream.fields,
    };
  });

  app.post('/upload2', function* () {
    yield this.getFileStream({ limits: { fileSize: '1kb' } });
    this.body = this.request.body;
  })

  app.post('/upload/async', 'async.async');

  app.post('/upload/allowEmpty', 'async.allowEmpty');
};
