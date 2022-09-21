'use strict';

const path = require('path');
const fs = require('fs').promises;
const os = require('os');

module.exports = app => {
  // mock oss
  app.context.oss = {
    async put(name, stream) {
      const storefile = path.join(os.tmpdir(), name);
      fs.mkdir(path.dirname(storefile), { recursive: true });

      return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(storefile);
        stream.pipe(writeStream);

        if (!name.includes('not-handle-error-event')) {
          stream.on('error', err => {
            console.log('read stream error: %s', err);
            reject(err);
          });
        }

        writeStream.on('error', err => {
          console.log('write stream error: %s', err);
          reject(err);
        });
        writeStream.on('close', () => {
          resolve({
            name,
            url: 'http://mockoss.com/' + name,
            res: {
              status: 200,
            },
          });
        });
      });
    },
  };

  app.get('/upload', async ctx => {
    ctx.set('x-csrf', ctx.csrf);
    ctx.body = 'hi';
  });

  app.post('/upload', async ctx => {
    const stream = await ctx.getFileStream();
    const name = 'egg-multipart-test/' + process.version + '-' + Date.now() + '-' + path.basename(stream.filename);
    const result = await ctx.oss.put(name, stream);
    if (name.includes('not-handle-error-event-and-mock-stream-error')) {
      process.nextTick(() => stream.emit('error', new Error('mock stream unhandle error')));
    }
    ctx.body = {
      name: result.name,
      url: result.url,
      status: result.res.status,
      fields: stream.fields,
    };
  });
};
