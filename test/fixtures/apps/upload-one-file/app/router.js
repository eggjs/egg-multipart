'use strict';

const path = require('path');
const is = require('is-type-of');
const fs = require('fs').promises;
const { createWriteStream } = require('fs');
const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

module.exports = app => {
  // mock oss
  app.context.oss = {
    async put(name, stream) {
      const tmpfile = path.join(app.config.baseDir, 'run', Date.now() + name);
      await fs.mkdir(path.dirname(tmpfile), { recursive: true });
      const writeStream = createWriteStream(tmpfile);
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

  app.get('/', async ctx => {
    ctx.body = {
      app: is.object(ctx.app.oss),
      ctx: is.object(ctx.oss),
      putBucket: is.generatorFunction(ctx.oss.putBucket),
    };
  });

  app.get('/uploadtest', async ctx => {
    const name = 'egg-oss-test-upload-' + process.version + '-' + Date.now();
    ctx.body = await ctx.oss.put(name, fs.createReadStream(__filename));
  });

  app.get('/upload', async ctx => {
    ctx.set('x-csrf', ctx.csrf);
    ctx.body = 'hi';
    // await ctx.render('upload.html');
  });

  app.post('/upload', async ctx => {
    const stream = await ctx.getFileStream();
    const name = 'egg-multipart-test/' + process.version + '-' + Date.now() + '-' + path.basename(stream.filename);
    // 文件处理，上传到云存储等等
    const result = await ctx.oss.put(name, stream);
    ctx.body = {
      name: result.name,
      url: result.url,
      status: result.res.status,
      fields: stream.fields,
    };
  });

  app.post('/upload2', async ctx => {
    await ctx.getFileStream({ limits: { fileSize: '1kb' } });
    ctx.body = ctx.request.body;
  })

  app.post('/upload/async', 'async.async');

  app.post('/upload/allowEmpty', 'async.allowEmpty');
};
