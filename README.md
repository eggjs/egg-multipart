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

通过内置 [multipart](https://github.com/cojs/multipart) 实现了文件流式上传，
能做到请求文件数据不落地本地磁盘即可完成处理。

在应用中通过 `this.multipart()` 拿到文件流，直接传给图片处理模块 gm 或者直接上传到云存储 tfs 和 oss 都是可以实现的。

## 文件扩展名白名单

出于安全考虑，上传不在白名单内的文件，会直接被拦截并以 `400 Bad request` 响应返回。

默认的文件扩展名白名单如下：

```js
var whitelist = [
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

### 扩展名

开发者可以根据应用需求，增加额外的文件扩展名，通过在 `config.default.js` 中配置：

```js
exports.multipart = {
  fileExtensions: [
    '.foo',
    '.apk',
  ],
};
```

也可以选择__覆盖__内置的 whitelist 列表，例如只允许上传 png 图片：

```js
exports.multipart = {
  whitelist: [
    '.png',
  ],
};
```

__注意，当传递了 `whitelist` 参数的时候 `fileExtensions` 参数失效。__

## 使用示例

### 上传一个文件

通过 `ctx.getFileStream*()` 接口能获取到上传的文件流。

浏览器端 html 代码:

```html
<form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
  title: <input name="title" />
  file: <input name="file" type="file" />
  <button type="submit">上传</button>
</form>
```

服务端 controller 代码: `POST /upload`

```js
const path = require('path');
const sendToWormhole = require('stream-wormhole');

module.exports = function*() {
  const stream = yield this.getFileStream();
  const name = 'egg-multipart-test/' + path.basename(stream.filename);
  // 文件处理，上传到云存储等等
  let result;
  try {
    result = yield this.oss.put(name, stream);
  } catch (err) {
    // 必须将上传的文件流消费掉，要不然浏览器响应会卡死
    yield sendToWormhole(stream);
    throw err;
  }

  this.body = {
    url: result.url,
    // 所有表单字段都能通过 `stream.fields` 获取到
    fields: stream.fields,
  };
};
```

### 上传多个文件

浏览器端 html 代码:

```html
<form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
  title: <input name="title" />
  file: <input name="file" type="file" />
  <button type="submit">上传</button>
</form>
```

服务端 controller 代码: `POST /upload`

```js
const sendToWormhole = require('stream-wormhole');

module.exports = function*() {
  const parts = this.multipart();
  let part;
  while ((part = yield parts) != null) {
    if (part.length) {
      // arrays are busboy fields
      console.log('field: ' + part[0]);
      console.log('value: ' + part[1]);
      console.log('valueTruncated: ' + part[2]);
      console.log('fieldnameTruncated: ' + part[3]);
    } else {
      if (!part.filename) {
        // 这时是用户没有选择文件就点击了上传(part 是 file stream，但是 part.filename 为空)
        // 需要做出处理，例如给出错误提示消息
        return;
      }
      // otherwise, it's a stream
      console.log('field: ' + part.fieldname);
      console.log('filename: ' + part.filename);
      console.log('encoding: ' + part.encoding);
      console.log('mime: ' + part.mime);
      // 文件处理，上传到云存储等等
      let result;
      try {
        result = yield this.oss.put('egg-multipart-test/' + part.filename, part);
      } catch (err) {
        // 必须将上传的文件流消费掉，要不然浏览器响应会卡死
        yield sendToWormhole(stream);
        throw err;
      }
      console.log(result);
    }
  }
  console.log('and we are done parsing the form!');
}
```