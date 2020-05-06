'use strict';

const assert = require('assert');
const Agent = require('http').Agent;
const formstream = require('formstream');
const urllib = require('urllib');
const path = require('path');
const fs = require('mz/fs');
const mock = require('egg-mock');
const sleep = require('mz-modules/sleep');

const agent = new Agent({
  keepAlive: true,
});

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

    it('should not has clean_tmpdir schedule', async () => {
      try {
        await app.runSchedule('clean_tmpdir');
        throw new Error('should not run this');
      } catch (err) {
        assert(err.message === '[egg-schedule] Cannot find schedule clean_tmpdir');
      }
    });

    it('should alway register clean_tmpdir schedule in stream mode', () => {
      const logger = app.loggers.scheduleLogger;
      const content = fs.readFileSync(logger.options.file, 'utf8');
      assert(/\[egg-schedule\]: register schedule .+clean_tmpdir\.js/.test(content));
    });

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

    it('should auto consumed file stream on error throw', function* () {
      for (let i = 0; i < 10; i++) {
        const form = formstream();
        form.file('file', path.join(__dirname, 'fixtures/bigfile.js'));

        const headers = form.headers();
        const url = host + '/upload?mock_undefined_error=1';
        const result = yield urllib.request(url, {
          method: 'POST',
          headers,
          stream: form,
          dataType: 'json',
          agent,
        });

        assert(result.status === 500);
        const data = result.data;
        assert(data.message === 'part.foo is not a function');
        yield sleep(100);
      }
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
      assert(data.message === 'Invalid filename: foo.rar');
    });

    it('should not throw 400 when file not speicified', function* () {
      const form = formstream();
      // 模拟用户未选择文件点击了上传，这时 cotroller 是有 file stream 的，因为指定了 MIME application/octet-stream
      form.buffer('file', Buffer.from(''), '', 'application/octet-stream');
      const headers = form.headers();
      const res = yield urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.message === 'no file');
    });

    it('should not throw 400 when file stream empty', function* () {
      const form = formstream();
      form.field('foo', 'bar');
      // 模拟用户未选择文件点击了上传，这时 cotroller 是有 file stream 的，因为指定了 MIME application/octet-stream
      // form.buffer('file', Buffer.from(''), '', 'application/octet-stream');
      const headers = form.headers();
      const res = yield urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.message === 'no file');
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

    it('should upload when extname speicified in fileExtensions and extname is in upper case', function* () {
      const form = formstream();
      form.file('file', __filename, 'bar.BAR');
      const headers = form.headers();
      const res = yield urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.filename === 'bar.BAR');
    });

    it('should upload when extname speicified in fileExtensions and extname is missing dot', function* () {
      const form = formstream();
      form.file('file', __filename, 'bar.abc');
      const headers = form.headers();
      const res = yield urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.filename === 'bar.abc');
    });

    it('should upload when extname is not speicified', function* () {
      const form = formstream();
      form.file('file', __filename, 'bar');
      const headers = form.headers();
      const res = yield urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.filename === 'bar');
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
        dataType: 'json',
      });

      assert(res.status === 400);
      assert(res.data.message === 'Content-Type must be multipart/*');
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

    it('should upload when extname speicified in whitelist and extname is in upper case', function* () {
      const form = formstream();
      form.file('file', __filename, 'bar.WHITELIST');
      const headers = form.headers();
      const res = yield urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.filename === 'bar.WHITELIST');
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
      assert(data.message === 'Invalid filename: foo.foo');
    });
  });

  describe('whitelist-function', () => {
    let app;
    let server;
    let host;
    before(() => {
      app = mock.app({
        baseDir: 'apps/whitelist-function',
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

    it('should upload when extname pass whitelist function', function* () {
      const form = formstream();
      form.file('file', __filename, 'bar');
      const headers = form.headers();
      const res = yield urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.filename === 'bar');
    });

    it('should throw 400 when extname not match whitelist function', function* () {
      const form = formstream();
      form.file('file', __filename, 'foo.png');
      const headers = form.headers();
      const res = yield urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 400);
      const data = JSON.parse(res.data);
      assert(data.message === 'Invalid filename: foo.png');
    });

    it('should throw 400 when whitelist function throw error', function* () {
      const form = formstream();
      form.file('file', __filename, 'error');
      const headers = form.headers();
      const res = yield urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form,
      });

      assert(res.status === 400);
      const data = JSON.parse(res.data);
      assert(data.message === 'mock checkExt error');
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
      yield app.httpRequest()
        .get('/upload')
        .expect(200);
    });
    after(() => app.close());
    after(() => server.close());
    beforeEach(() => app.mockCsrf());
    afterEach(mock.restore);

    it('should handle one upload file in simple way', function* () {
      const form = formstream();
      form.field('foo', 'bar').field('[', 'toString').field(']', 'toString');
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
      assert.deepEqual(data.fields, {
        '[': 'toString',
        ']': 'toString',
        foo: 'bar',
      });
      assert(data.status === 200);
      assert(typeof data.name === 'string');
      assert(data.url.includes('http://mockoss.com/egg-multipart-test/'));
    });

    it('should handle one upload file in simple way with async function controller', function* () {
      const form = formstream();
      form.file('file', __filename);

      const headers = form.headers();
      const url = host + '/upload/async';
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
      assert(data.url.includes('http://mockoss.com/egg-multipart-test/'));
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

      const data = res.data;
      assert(res.status === 200);
      assert(data.status === 200);
      assert(typeof data.name === 'string');
      assert(data.url.includes('http://mockoss.com/egg-multipart-test/'));
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
      assert(res.data.toString().includes('Can\'t found upload file'));
    });

    it('should no file upload and only fields', function* () {
      const form = formstream();
      form.field('hi', 'ok');
      form.field('hi2', 'ok2');

      const headers = form.headers();
      const url = host + '/upload/allowEmpty';
      const res = yield urllib.request(url, {
        method: 'POST',
        headers,
        stream: form,
        dataType: 'json',
      });

      assert(res.status === 200);
      assert.deepEqual(res.data, {
        fields: {
          hi: 'ok',
          hi2: 'ok2',
        },
      });
    });

    it('should 400 when no file speicified', function* () {
      const form = formstream();
      form.buffer('file', Buffer.from(''), '', 'application/octet-stream');
      const headers = form.headers();
      const url = host + '/upload';
      const res = yield urllib.request(url, {
        method: 'POST',
        headers,
        stream: form,
      });
      assert(res.status === 400);
      assert(res.data.toString().includes('Can\'t found upload file'));
    });

    it('should auto consumed file stream on error throw', function* () {
      for (let i = 0; i < 10; i++) {
        const form = formstream();
        form.file('file', path.join(__dirname, 'fixtures/bigfile.js'));

        const headers = form.headers();
        const url = host + '/upload/async?foo=error';
        const result = yield urllib.request(url, {
          method: 'POST',
          headers,
          stream: form,
          dataType: 'json',
          agent,
        });

        assert(result.status === 500);
        const data = result.data;
        assert(data.message === 'stream.foo is not a function');
        yield sleep(100);
      }
    });

    it('should file hit limits fileSize', function* () {
      const form = formstream();
      form.buffer('file', Buffer.alloc(1024 * 1024 * 100), 'foo.js');

      const headers = form.headers();
      const url = host + '/upload/async?fileSize=100000';
      const result = yield urllib.request(url, {
        method: 'POST',
        headers,
        stream: form,
        dataType: 'json',
        agent,
      });

      assert(result.status === 413);
      const data = result.data;
      assert(data.message.includes('Request file too large'));
    });

    it('should file hit limits fileSize (byte)', function* () {
      const form = formstream();
      form.buffer('file', Buffer.alloc(1024 * 1024 * 100), 'foo.js');

      const headers = form.headers();
      const url = host + '/upload2';
      const result = yield urllib.request(url, {
        method: 'POST',
        headers,
        stream: form,
        dataType: 'json',
        agent,
      });

      assert(result.status === 413);
      const data = result.data;
      assert(data.message.includes('Request file too large'));
    });
  });

  describe('upload over fileSize limit', () => {
    let app;
    let server;
    let host;
    const bigfile = path.join(__dirname, 'big.js');
    before(() => {
      app = mock.app({
        baseDir: 'apps/upload-limit',
      });
      return app.ready();
    });
    before(function* () {
      yield fs.writeFile(bigfile, Buffer.alloc(1024 * 1024 * 2));
      server = app.listen();
      host = 'http://127.0.0.1:' + server.address().port;
      yield app.httpRequest()
        .get('/upload')
        .expect(200);
    });
    after(function* () {
      yield fs.unlink(bigfile);
      server.close();
      yield app.close();
    });
    beforeEach(() => app.mockCsrf());
    afterEach(mock.restore);

    it('should show error', function* () {
      const form = formstream();
      form.field('foo', 'bar').field('[', 'toString').field(']', 'toString');
      form.file('file', bigfile);

      const headers = form.headers();
      const url = host + '/upload';
      const res = yield urllib.request(url, {
        method: 'POST',
        headers,
        stream: form,
        dataType: 'json',
      });

      const data = res.data;
      assert(res.status === 413);
      assert(data.message.includes('Request file too large'));

      app.expectLog('nodejs.MultipartFileTooLargeError: Request file too large', 'coreLogger');
    });

    it('should ignore error when stream not handle error event', function* () {
      const form = formstream();
      form.field('foo', 'bar').field('[', 'toString').field(']', 'toString');
      form.file('file', bigfile, 'not-handle-error-event.js');

      const headers = form.headers();
      const url = host + '/upload';
      const res = yield urllib.request(url, {
        method: 'POST',
        headers,
        stream: form,
        dataType: 'json',
      });

      const data = res.data;
      assert(res.status === 200);
      assert(data.url);

      app.expectLog('nodejs.MultipartFileTooLargeError: Request file too large', 'errorLogger');
      app.expectLog(/filename: ['"]not-handle-error-event.js['"]/, 'errorLogger');
    });

    it('should ignore stream next errors after limit event fire', function* () {
      const form = formstream();
      form.field('foo', 'bar').field('[', 'toString').field(']', 'toString');
      form.file('file', bigfile, 'not-handle-error-event-and-mock-stream-error.js');

      const headers = form.headers();
      const url = host + '/upload';
      const res = yield urllib.request(url, {
        method: 'POST',
        headers,
        stream: form,
        dataType: 'json',
      });

      const data = res.data;
      assert(res.status === 200);
      assert(data.url);

      app.expectLog('nodejs.MultipartFileTooLargeError: Request file too large', 'errorLogger');
      app.expectLog(/filename: ['"]not-handle-error-event-and-mock-stream-error.js['"]/, 'errorLogger');
    });
  });
});
