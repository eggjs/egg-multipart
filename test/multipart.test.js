'use strict';

require('egg-mock');
const request = require('supertest');
const should = require('should');
const formstream = require('formstream');
const urllib = require('urllib');
const mm = require('mm');

describe('test/multipart.test.js', () => {
  let app;
  let csrfToken;
  let cookies;
  let host;
  let server;
  before(done => {
    app = mm.app({
      baseDir: 'apps/multipart',
      plugin: 'multipart',
    });
    app.ready(() => {
      server = app.listen();
      request(server)
        .get('/')
        .expect(200, (err, res) => {
          csrfToken = res.headers['x-csrf'];
          cookies = (res.headers['set-cookie'] || []).join(';');
          host = 'http://127.0.0.1:' + server.address().port;
          done(err);
        });
    });
  });

  after(() => server.close());

  it('should upload with csrf', done => {
    const form = formstream();
    // form.file('file', filepath, filename);
    form.file('file', __filename);
    // other form fields
    form.field('foo', 'fengmk2').field('love', 'chair');

    const headers = form.headers();
    headers.Cookie = cookies;
    urllib.request(host + '/upload?_csrf=' + csrfToken, {
      method: 'POST',
      headers,
      stream: form,
    }, function(err, body, res) {
      should.not.exist(err);
      res.statusCode.should.equal(200);
      const data = JSON.parse(body);
      data.filename.should.equal('multipart.test.js');
      done();
    });
  });

  it('should upload.json with ctoken', done => {
    const form = formstream();
    // form.file('file', filepath, filename);
    form.file('file', __filename);
    // other form fields
    form.field('foo', 'fengmk2').field('love', 'chair');

    const headers = form.headers();
    headers.Cookie = 'ctoken=123';
    urllib.request(host + '/upload.json?ctoken=123', {
      method: 'POST',
      headers,
      stream: form,
    }, function(err, body, res) {
      should.not.exist(err);
      res.statusCode.should.equal(200);
      const data = JSON.parse(body);
      data.filename.should.equal('multipart.test.js');
      done();
    });
  });

  it('should handle unread stream and return error response', done => {
    const form = formstream();
    // form.file('file', filepath, filename);
    form.file('file', __filename);
    // other form fields
    form.field('foo', 'fengmk2').field('love', 'chair');

    const headers = form.headers();
    headers.Cookie = cookies;
    urllib.request(host + '/upload?mock_stream_error=1&_csrf=' + csrfToken, {
      method: 'POST',
      headers,
      stream: form,
    }, function(err, body) {
      should.not.exist(err);
      body.toString().should.containEql('ENOENT:');
      done();
    });
  });

  it('should throw 400 when extname wrong', done => {
    const form = formstream();
    form.file('file', __filename, 'foo.rar');
    const headers = form.headers();
    headers.Cookie = 'ctoken=123';
    urllib.request(host + '/upload.json?ctoken=123', {
      method: 'POST',
      headers,
      stream: form,
    }, function(err, body, res) {
      should.not.exist(err);
      res.statusCode.should.equal(400);
      const data = JSON.parse(body);
      data.should.eql({
        message: 'Invalid filename extension: .rar',
      });
      done();
    });
  });

  it('should not throw 400 when file not speicified', done => {
    const form = formstream();
    // 模拟用户未选择文件点击了上传，这时 cotroller 是有 file stream 的，因为指定了 MIME application/octet-stream
    form.buffer('file', new Buffer(''), '', 'application/octet-stream');
    const headers = form.headers();
    headers.Cookie = 'ctoken=123';
    urllib.request(host + '/upload.json?ctoken=123', {
      method: 'POST',
      headers,
      stream: form,
    }, function(err, body, res) {
      should.not.exist(err);
      res.statusCode.should.equal(200);
      const data = JSON.parse(body);
      data.should.eql({
        message: 'no file',
      });
      done();
    });
  });

  it('should not throw 400 when file stream empty', done => {
    const form = formstream();
    form.field('foo', 'bar');
    // 模拟用户未选择文件点击了上传，这时 cotroller 是有 file stream 的，因为指定了 MIME application/octet-stream
    // form.buffer('file', new Buffer(''), '', 'application/octet-stream');
    const headers = form.headers();
    headers.Cookie = 'ctoken=123';
    urllib.request(host + '/upload.json?ctoken=123', {
      method: 'POST',
      headers,
      stream: form,
    }, (err, body, res) => {
      should.not.exist(err);
      res.statusCode.should.equal(200);
      const data = JSON.parse(body);
      data.should.eql({
        message: 'no file',
      });
      done();
    });
  });

  it('should upload when extname speicified in fileExtensions', done => {
    const form = formstream();
    form.file('file', __filename, 'bar.foo');
    const headers = form.headers();
    headers.Cookie = 'ctoken=123';
    urllib.request(host + '/upload.json?ctoken=123', {
      method: 'POST',
      headers,
      stream: form,
    }, (err, body, res) => {
      should.not.exist(err);
      res.statusCode.should.equal(200);
      const data = JSON.parse(body);
      data.filename.should.equal('bar.foo');
      res.statusCode.should.equal(200);
      done();
    });
  });

  it('should upload when extname speicified in whitelist', done => {
    const app = mm.app({
      baseDir: 'apps/multipart-with-whitelist',
      plugin: 'multipart',
    });
    const server = app.listen();
    const host = 'http://127.0.0.1:' + server.address().port;
    const form = formstream();
    form.file('file', __filename, 'bar.whitelist');
    const headers = form.headers();
    headers.Cookie = 'ctoken=123';
    urllib.request(host + '/upload.json?ctoken=123', {
      method: 'POST',
      headers,
      stream: form,
    }, (err, body, res) => {
      should.not.exist(err);
      res.statusCode.should.equal(200);
      const data = JSON.parse(body);
      data.filename.should.equal('bar.whitelist');
      res.statusCode.should.equal(200);
      server.close();
      done();
    });
  });

  it('should throw 400 when extname speicified in fileExtensions, but not in whitelist', done => {
    const app = mm.app({
      baseDir: 'apps/multipart-with-whitelist',
      plugin: 'multipart',
    });
    const server = app.listen();
    const host = 'http://127.0.0.1:' + server.address().port;

    const form = formstream();
    form.file('file', __filename, 'foo.foo');
    const headers = form.headers();
    headers.Cookie = 'ctoken=123';
    urllib.request(host + '/upload.json?ctoken=123', {
      method: 'POST',
      headers,
      stream: form,
    }, (err, body, res) => {
      should.not.exist(err);
      res.statusCode.should.equal(400);
      const data = JSON.parse(body);
      data.should.eql({
        message: 'Invalid filename extension: .foo',
      });
      server.close();
      done();
    });
  });

  it('should 400 upload with wrong content-type', done => {
    urllib.request(host + '/upload?_csrf=' + csrfToken, {
      method: 'POST',
      headers: {
        Cookie: cookies,
      },
    }, (err, body, res) => {
      should.not.exist(err);
      res.statusCode.should.equal(400);
      const data = body.toString();
      data.should.match(/Content-Type must be multipart/);
      done();
    });
  });

  it('should 400 upload.json with wrong content-type', done => {
    urllib.request(host + '/upload.json?ctoken=123', {
      method: 'POST',
      headers: {
        Cookie: 'ctoken=123',
      },
    }, (err, body, res) => {
      should.not.exist(err);
      res.statusCode.should.equal(400);
      const data = body.toString();
      data.should.eql('{"message":"Content-Type must be multipart/*"}');
      done();
    });
  });

  it.skip('should 403 upload with wrong csrf', done => {
    const form = formstream();
    // form.file('file', filepath, filename);
    form.file('file', __filename);
    // other form fields
    form.field('foo', 'fengmk2').field('love', 'chair');

    const headers = form.headers();
    headers.Cookie = cookies;
    urllib.request(host + '/upload?_csrf=123', {
      method: 'POST',
      headers,
      stream: form,
    }, (err, body, res) => {
      should.not.exist(err);
      res.statusCode.should.equal(403);
      const data = body.toString();
      data.should.eql('invalid csrf token');
      done();
    });
  });

  it.skip('should 403 upload.json with wrong ctoken', done => {
    const form = formstream();
    // form.file('file', filepath, filename);
    form.file('file', __filename);
    // other form fields
    form.field('foo', 'fengmk2').field('love', 'chair');

    const headers = form.headers();
    headers['accept'] = 'application/json';
    urllib.request(host + '/upload.json?ctoken=123', {
      method: 'POST',
      headers,
      stream: form,
    }, (err, body, res) => {
      should.not.exist(err);
      res.statusCode.should.equal(403);
      const data = JSON.parse(body);
      data.should.eql({
        message: 'missing cookie ctoken',
      });
      done();
    });
  });

  describe('upload one file', () => {
    let server;
    const info = {};
    before(done => {
      const app = mm.app({
        baseDir: 'apps/upload-one-file',
        plugin: 'multipart',
      });
      server = app.listen();
      request(server)
        .get('/upload')
        .expect(200, (err, res) => {
          info.csrfToken = res.headers['x-csrf'];
          info.cookies = (res.headers['set-cookie'] || []).join(';');
          info.host = 'http://127.0.0.1:' + server.address().port;
          done(err);
        });
    });

    after(() => server.close());

    it('should handle one upload file in simple way', done => {
      const form = formstream();
      form.file('file', __filename);

      const headers = form.headers();
      headers.Cookie = info.cookies;
      const url = info.host + '/upload?_csrf=' + info.csrfToken;
      urllib.request(url, {
        method: 'POST',
        headers,
        stream: form,
        dataType: 'json',
      }, (err, data, res) => {
        should.not.exist(err);
        data.fields.should.eql({});
        data.status.should.equal(200);
        data.name.should.be.a.String;
        data.url.should.containEql('http://mockoss.com/chair-multipart-test/');
        res.statusCode.should.equal(200);
        done();
      });
    });

    it('should handle one upload file and all fields', done => {
      const form = formstream();
      form.field('f1', 'f1-value');
      form.field('f2', 'f2-value-中文');
      form.file('file', __filename);

      const headers = form.headers();
      headers.Cookie = info.cookies;
      const url = info.host + '/upload?_csrf=' + info.csrfToken;
      urllib.request(url, {
        method: 'POST',
        headers,
        stream: form,
        dataType: 'json',
      }, (err, data, res) => {
        should.not.exist(err);
        data.status.should.equal(200);
        data.name.should.be.a.String;
        data.url.should.containEql('http://mockoss.com/chair-multipart-test/');
        data.fields.should.eql({
          f1: 'f1-value',
          f2: 'f2-value-中文',
        });
        res.statusCode.should.equal(200);
        done();
      });
    });

    it('should 400 when no file upload', done => {
      const form = formstream();
      form.field('hi', 'ok');

      const headers = form.headers();
      headers.Cookie = info.cookies;
      const url = info.host + '/upload?_csrf=' + info.csrfToken;
      urllib.request(url, {
        method: 'POST',
        headers,
        stream: form,
      }, (err, body, res) => {
        should.not.exist(err);
        body.toString().should.containEql('Can&#39;t found upload file');
        res.statusCode.should.equal(400);
        done();
      });
    });

    it('should 400 when no file speicified', done => {
      const form = formstream();
      form.buffer('file', new Buffer(''), '', 'application/octet-stream');
      const headers = form.headers();
      headers.Cookie = info.cookies;
      const url = info.host + '/upload?_csrf=' + info.csrfToken;
      urllib.request(url, {
        method: 'POST',
        headers,
        stream: form,
      }, (err, body, res) => {
        should.not.exist(err);
        body.toString().should.containEql('Can&#39;t found upload file');
        res.statusCode.should.equal(400);
        done();
      });
    });
  });
});
