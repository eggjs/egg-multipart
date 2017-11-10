# egg-multipart

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/egg-multipart.svg?style=flat-square
[npm-url]: https://npmjs.org/package/egg-multipart
[travis-image]: https://img.shields.io/travis/eggjs/egg-multipart.svg?style=flat-square
[travis-url]: https://travis-ci.org/eggjs/egg-multipart
[codecov-image]: https://codecov.io/github/eggjs/egg-multipart/coverage.svg?branch=master
[codecov-url]: https://codecov.io/github/eggjs/egg-multipart?branch=master
[david-image]: https://img.shields.io/david/eggjs/egg-multipart.svg?style=flat-square
[david-url]: https://david-dm.org/eggjs/egg-multipart
[snyk-image]: https://snyk.io/test/npm/egg-multipart/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/egg-multipart
[download-image]: https://img.shields.io/npm/dm/egg-multipart.svg?style=flat-square
[download-url]: https://npmjs.org/package/egg-multipart

Use [co-busboy](https://github.com/cojs/busboy) to upload file by streaming and process it without save to disk.

Just use `ctx.multipart()` to got file stream, then pass to image processing liberary such as `gm` or upload to cloud storage such as `oss`.

## Whitelist of file extensions

For security, if uploading file extension is not in white list, will response as `400 Bad request`.

Default Whitelist:

```js
const whitelist = [
  // images
  '.jpg', '.jpeg', // image/jpeg
  '.png', // image/png, image/x-png
  '.gif', // image/gif
  '.bmp', // image/bmp
  '.wbmp', // image/vnd.wap.wbmp
  '.webp',
  '.tif',
  '.psd',
  // text
  '.svg',
  '.js', '.jsx',
  '.json',
  '.css', '.less',
  '.html', '.htm',
  '.xml',
  // tar
  '.zip',
  '.gz', '.tgz', '.gzip',
  // video
  '.mp3',
  '.mp4',
  '.avi',
];
```

### fileSize

The default fileSize that multipart can accept is `10mb`. if you upload a large file, you should specify this config.

```js
// config/config.default.js
exports.multipart = {
  fileSize: '50mb',
};
```

### Custom Config

Developer can custom additional file extensions:

```js
// config/config.default.js
exports.multipart = {
  // will append to whilelist
  fileExtensions: [
    '.foo',
    '.apk',
  ],
};
```

Can also **override** built-in whitelist, such as only allow png:

```js
// config/config.default.js
exports.multipart = {
  whitelist: [
    '.png',
  ],
};
```

Or by function：

```js
exports.multipart = {
  whitelist: (filename) => [ '.png' ].includes(path.extname(filename) || '')
};
```

**Note: if define `whitelist`, then `fileExtensions` will be ignored.**

## Examples

[More Examples](https://github.com/eggjs/examples/tree/master/multipart)

### Upload File

You can got upload stream by `ctx.getFileStream*()`.

```html
<form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
  title: <input name="title" />
  file: <input name="file" type="file" />
  <button type="submit">Upload</button>
</form>
```

Controller which hanlder `POST /upload`:

```js
// app/controller/upload.js
const path = require('path');
const sendToWormhole = require('stream-wormhole');
const Controller = require('egg').Controller;

module.exports = Class UploadController extends Controller {
  async upload() {
    const ctx = this.ctx;
    const stream = await ctx.getFileStream();
    const name = 'egg-multipart-test/' + path.basename(stream.filename);
    let result;
    try {
      // process file or upload to cloud storage
      result = await ctx.oss.put(name, stream);
    } catch (err) {
      // must consume the stream, otherwise browser will be stuck.
      await sendToWormhole(stream);
      throw err;
    }

    ctx.body = {
      url: result.url,
      // process form fields by `stream.fields`
      fields: stream.fields,
    };
  }
};
```

### Upload Multiple Files

```html
<form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
  title: <input name="title" />
  file: <input name="file" type="file" />
  <button type="submit">Upload</button>
</form>
```

Controller which hanlder `POST /upload`:

```js
// app/controller/upload.js
const sendToWormhole = require('stream-wormhole');
const Controller = require('egg').Controller;

module.exports = Class UploadController extends Controller {
  async upload() {
    const ctx = this.ctx;
    const parts = ctx.multipart();
    let part;
    while ((part = await parts()) != null) {
      if (part.length) {
        // arrays are busboy fields
        console.log('field: ' + part[0]);
        console.log('value: ' + part[1]);
        console.log('valueTruncated: ' + part[2]);
        console.log('fieldnameTruncated: ' + part[3]);
      } else {
        if (!part.filename) {
          // user click `upload` before choose a file,
          // `part` will be file stream, but `part.filename` is empty
          // must handler this, such as log error.
          return;
        }
        // otherwise, it's a stream
        console.log('field: ' + part.fieldname);
        console.log('filename: ' + part.filename);
        console.log('encoding: ' + part.encoding);
        console.log('mime: ' + part.mime);
        let result;
        try {
          result = await ctx.oss.put('egg-multipart-test/' + part.filename, part);
        } catch (err) {
          await sendToWormhole(part);
          throw err;
        }
        console.log(result);
      }
    }
    console.log('and we are done parsing the form!');
  }
};
```
