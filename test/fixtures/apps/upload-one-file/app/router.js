'use strict';

const path = require('path');
const is = require('is-type-of');
const fs = require('fs').promises;
const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

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

  app.get('/', async () => {
    this.body = {
      app: is.object(this.app.oss),
      ctx: is.object(this.oss),
      putBucket: is.generatorFunction(this.oss.putBucket),
    };
  });

  app.get('/uploadtest', async () => {
    const name = 'egg-oss-test-upload-' + process.version + '-' + Date.now();
    this.body = await this.oss.put(name, fs.createReadStream(__filename));
  });

  app.get('/upload', async () => {
    this.set('x-csrf', this.csrf);
    this.body = 'hi';
    // await this.render('upload.html');
  });

  app.post('/upload', async () => {
    const stream = await this.getFileStream();
    const name = 'egg-multipart-test/' + process.version + '-' + Date.now() + '-' + path.basename(stream.filename);
    // 文件处理，上传到云存储等等
    const result = await this.oss.put(name, stream);
    this.body = {
      name: result.name,
      url: result.url,
      status: result.res.status,
      fields: stream.fields,
    };
  });

  app.post('/upload2', async () => {
    await this.getFileStream({ limits: { fileSize: '1kb' } });
    this.body = this.request.body;
  })

  app.post('/upload/async', 'async.async');

  app.post('/upload/allowEmpty', 'async.allowEmpty');
};
