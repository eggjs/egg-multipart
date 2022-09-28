'use strict';

const assert = require('assert');
const formstream = require('formstream');
const urllib = require('urllib');
const path = require('path');
const mock = require('egg-mock');

describe.only('test/multipart-for-await.test.js', () => {
  let app;
  let server;
  let host;
  before(async () => {
    app = mock.app({
      baseDir: 'apps/multipart-for-await',
    });
    await app.ready();
    server = app.listen();
    host = 'http://127.0.0.1:' + server.address().port;
  });
  after(() => app.close());
  after(() => server.close());
  beforeEach(() => app.mockCsrf());
  afterEach(mock.restore);

  it('should suport for await...of', async () => {
    const form = formstream();
    form.field('foo', 'bar');
    form.field('love', 'egg');
    form.file('file1', path.join(__dirname, 'fixtures/中文名.js'));
    form.file('file2', path.join(__dirname, 'fixtures/testfile.js'));

    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers: form.headers(),
      stream: form,
      dataType: 'json',
    });

    const data = res.data;
    console.log(data);
    assert(data.fields.foo === 'bar');
    assert(data.fields.love === 'egg');
    assert(data.files.file1.fileName === '中文名.js');
    assert(data.files.file1.content === 'hello\n');
    assert(data.files.file2.fileName === 'testfile.js');
    assert(data.files.file2.content === 'this is a test file\n');
  });

  describe('should throw when limit', () => {
    it('limit fileSize', async () => {
      const form = formstream();
      form.field('foo', 'bar');
      form.field('love', 'egg');
      // form.file('file1', path.join(__dirname, 'fixtures/中文名.js'));
      form.file('file2', path.join(__dirname, 'fixtures/bigfile.js'));

      const res = await urllib.request(host + '/upload', {
        method: 'POST',
        headers: form.headers(),
        stream: form,
        dataType: 'json',
      });

      const { data, status } = res;
      assert(status === 413);
      assert(data.message === 'Reach fileSize limit');
    });

    it('limit fieldSize', async () => {
      const form = formstream();
      form.field('foo', 'bar');
      form.field('love', 'eggaaaaaaaaaaaaa');
      form.file('file1', path.join(__dirname, 'fixtures/中文名.js'));
      form.file('file2', path.join(__dirname, 'fixtures/testfile.js'));

      const res = await urllib.request(host + '/upload', {
        method: 'POST',
        headers: form.headers(),
        stream: form,
        dataType: 'json',
      });

      const { data, status } = res;
      assert(status === 413);
      assert(data.message === 'Reach fieldSize limit');
    });

    // TODO: still not support at busboy 1.x (only support at urlencoded)
    // https://github.com/mscdex/busboy/blob/v0.3.1/lib/types/multipart.js#L5
    // https://github.com/mscdex/busboy/blob/master/lib/types/multipart.js#L251
    it.skip('limit fieldNameSize', async () => {
      const form = formstream();
      form.field('fooaaaaaaaaaaaaaaa', 'bar');
      form.field('love', 'egg');
      form.file('file1', path.join(__dirname, 'fixtures/中文名.js'));
      form.file('file2', path.join(__dirname, 'fixtures/testfile.js'));

      const res = await urllib.request(host + '/upload', {
        method: 'POST',
        headers: form.headers(),
        stream: form,
        dataType: 'json',
      });

      const { data, status } = res;
      assert(status === 413);
      assert(data.message === 'Reach fieldNameSize limit');
    });
  });
});
