'use strict';

const assert = require('assert');
const request = require('supertest');
const formstream = require('formstream');
const urllib = require('urllib');
const mock = require('egg-mock');

describe('test/multipart.test.js', () => {

  describe('multipart', () => {
    let app;
    let server;
    let host;
    before(() => {
      app = mock.app({
        baseDir: 'apps/multipart',
      });
      return app.ready();
    });
    before(function* () {
      server = app.listen();
      host = 'http://127.0.0.1:' + server.address().port;
    });
    after(() => app.close());
    after(() => server.close());
    beforeEach(() => app.mockCsrf());
    afterEach(mock.restore);

    it('should upload with csrf', function* () {
      const form = formstream();
      // form.file('file', filepath, filename);
      form.file('file', __filename);
      // other form fields
      form.field('foo', 'fengmk2').field('love', 'chair');

      const headers = form.headers();
      const res = yield urllib.request(host + '/upload', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.filename === 'multipart.test.js');
    });

    it('should upload.json with ctoken', function* () {
      const form = formstream();
      // form.file('file', filepath, filename);
      form.file('file', __filename);
      // other form fields
      form.field('foo', 'fengmk2').field('love', 'chair');

      const headers = form.headers();
      const res = yield urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.filename === 'multipart.test.js');
    });

    it('should handle unread stream and return error response', function* () {
      const form = formstream();
      // form.file('file', filepath, filename);
      form.file('file', __filename);
      // other form fields
      form.field('foo', 'fengmk2').field('love', 'chair');

      const headers = form.headers();
      const res = yield urllib.request(host + '/upload?mock_stream_error=1', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.data.toString().includes('ENOENT:'));
    });

    it('should throw 400 when extname wrong', function* () {
      const form = formstream();
      form.file('file', __filename, 'foo.rar');
      const headers = form.headers();
      const res = yield urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 400);
      const data = JSON.parse(res.data);
      assert.deepEqual(data, {
        message: 'Invalid filename extension: .rar',
      });
    });

    it('should not throw 400 when file not speicified', function* () {
      const form = formstream();
      // 模拟用户未选择文件点击了上传，这时 cotroller 是有 file stream 的，因为指定了 MIME application/octet-stream
      form.buffer('file', new Buffer(''), '', 'application/octet-stream');
      const headers = form.headers();
      const res = yield urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert.deepEqual(data, {
        message: 'no file',
      });
    });

    it('should not throw 400 when file stream empty', function* () {
      const form = formstream();
      form.field('foo', 'bar');
      // 模拟用户未选择文件点击了上传，这时 cotroller 是有 file stream 的，因为指定了 MIME application/octet-stream
      // form.buffer('file', new Buffer(''), '', 'application/octet-stream');
      const headers = form.headers();
      const res = yield urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert.deepEqual(data, {
        message: 'no file',
      });
    });

    it('should upload when extname speicified in fileExtensions', function* () {
      const form = formstream();
      form.file('file', __filename, 'bar.foo');
      const headers = form.headers();
      const res = yield urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.filename === 'bar.foo');
    });

    it('should 400 upload with wrong content-type', function* () {
      const res = yield urllib.request(host + '/upload', {
        method: 'POST',
      });

      assert(res.status === 400);
      assert(/Content-Type must be multipart/.test(res.data));
    });

    it('should 400 upload.json with wrong content-type', function* () {
      const res = yield urllib.request(host + '/upload.json', {
        method: 'POST',
      });

      assert(res.status === 400);
      assert(res.data.toString() === '{"message":"Content-Type must be multipart/*"}');
    });
  });

  describe('whitelist', () => {
    let app;
    let server;
    let host;
    before(() => {
      app = mock.app({
        baseDir: 'apps/multipart-with-whitelist',
      });
      return app.ready();
    });
    before(function* () {
      server = app.listen();
      host = 'http://127.0.0.1:' + server.address().port;
    });
    after(() => app.close());
    after(() => server.close());
    beforeEach(() => app.mockCsrf());
    afterEach(mock.restore);

    it('should upload when extname speicified in whitelist', function* () {
      const form = formstream();
      form.file('file', __filename, 'bar.whitelist');
      const headers = form.headers();
      const res = yield urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.filename === 'bar.whitelist');
    });

    it('should throw 400 when extname speicified in fileExtensions, but not in whitelist', function* () {
      const form = formstream();
      form.file('file', __filename, 'foo.foo');
      const headers = form.headers();
      const res = yield urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 400);
      const data = JSON.parse(res.data);
      assert.deepEqual(data, {
        message: 'Invalid filename extension: .foo',
      });
    });
  });

  describe('upload one file', () => {
    let app;
    let server;
    let host;
    before(() => {
      app = mock.app({
        baseDir: 'apps/upload-one-file',
      });
      return app.ready();
    });
    before(function* () {
      server = app.listen();
      host = 'http://127.0.0.1:' + server.address().port;
      yield request(server)
        .get('/upload')
        .expect(200);
    });
    after(() => app.close());
    after(() => server.close());
    beforeEach(() => app.mockCsrf());
    afterEach(mock.restore);

    it('should handle one upload file in simple way', function* () {
      const form = formstream();
      form.file('file', __filename);

      const headers = form.headers();
      const url = host + '/upload';
      const res = yield urllib.request(url, {
        method: 'POST',
        headers,
        stream: form,
        dataType: 'json',
      });

      const data = res.data;
      assert.deepEqual(data.fields, {});
      assert(data.status === 200);
      assert(typeof data.name === 'string');
      assert(data.url.includes('http://mockoss.com/chair-multipart-test/'));
    });

    it('should handle one upload file and all fields', function* () {
      const form = formstream();
      form.field('f1', 'f1-value');
      form.field('f2', 'f2-value-中文');
      form.file('file', __filename);

      const headers = form.headers();
      const url = host + '/upload';
      const res = yield urllib.request(url, {
        method: 'POST',
        headers,
        stream: form,
        dataType: 'json',
      });

      assert(res.status === 200);
      const data = res.data;
      assert(data.status === 200);
      assert(typeof data.name === 'string');
      assert(data.url.includes('http://mockoss.com/chair-multipart-test/'));
      assert.deepEqual(data.fields, {
        f1: 'f1-value',
        f2: 'f2-value-中文',
      });
    });

    it('should 400 when no file upload', function* () {
      const form = formstream();
      form.field('hi', 'ok');

      const headers = form.headers();
      const url = host + '/upload';
      const res = yield urllib.request(url, {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 400);
      assert(res.data.toString().includes('Can&#39;t found upload file'));
    });

    it('should 400 when no file speicified', function* () {
      const form = formstream();
      form.buffer('file', new Buffer(''), '', 'application/octet-stream');
      const headers = form.headers();
      const url = host + '/upload';
      const res = yield urllib.request(url, {
        method: 'POST',
        headers,
        stream: form,
      });
      assert(res.status === 400);
      assert(res.data.toString().includes('Can&#39;t found upload file'));
    });
  });
});
