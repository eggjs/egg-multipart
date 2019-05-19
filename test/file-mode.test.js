'use strict';

const assert = require('assert');
const formstream = require('formstream');
const urllib = require('urllib');
const path = require('path');
const mock = require('egg-mock');
const rimraf = require('mz-modules/rimraf');
const mkdirp = require('mz-modules/mkdirp');
const fs = require('mz/fs');
const moment = require('moment');

describe('test/file-mode.test.js', () => {
  let app;
  let server;
  let host;
  before(() => {
    app = mock.app({
      baseDir: 'apps/file-mode',
    });
    return app.ready();
  });
  before(() => {
    server = app.listen();
    host = 'http://127.0.0.1:' + server.address().port;
  });
  after(() => {
    return rimraf(app.config.multipart.tmpdir);
  });
  after(() => app.close());
  after(() => server.close());
  beforeEach(() => app.mockCsrf());
  afterEach(mock.restore);

  it('should ignore non multipart request', async () => {
    const res = await app.httpRequest()
      .post('/upload')
      .send({
        foo: 'bar',
        n: 1,
      });
    assert(res.status === 200);
    assert.deepStrictEqual(res.body, {
      body: {
        foo: 'bar',
        n: 1,
      },
    });
  });

  it('should upload', async () => {
    const form = formstream();
    form.field('foo', 'fengmk2').field('love', 'egg');
    form.file('file1', __filename, 'foooooooo.js');
    form.file('file2', __filename);
    // will ignore empty file
    form.buffer('file3', Buffer.from(''), '', 'application/octet-stream');
    form.file('bigfile', path.join(__dirname, 'fixtures', 'bigfile.js'));
    // other form fields
    form.field('work', 'with Node.js');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form,
    });

    assert(res.status === 200);
    const data = JSON.parse(res.data);
    assert.deepStrictEqual(data.body, { foo: 'fengmk2', love: 'egg', work: 'with Node.js' });
    assert(data.files.length === 3);
    assert(data.files[0].field === 'file1');
    assert(data.files[0].filename === 'foooooooo.js');
    assert(data.files[0].encoding === '7bit');
    assert(data.files[0].mime === 'application/javascript');
    assert(data.files[0].filepath.startsWith(app.config.multipart.tmpdir));

    assert(data.files[1].field === 'file2');
    assert(data.files[1].fieldname === 'file2');
    assert(data.files[1].filename === 'file-mode.test.js');
    assert(data.files[1].encoding === '7bit');
    assert(data.files[1].transferEncoding === '7bit');
    assert(data.files[1].mime === 'application/javascript');
    assert(data.files[1].mimeType === 'application/javascript');
    assert(data.files[1].filepath.startsWith(app.config.multipart.tmpdir));

    assert(data.files[2].field === 'bigfile');
    assert(data.files[2].filename === 'bigfile.js');
    assert(data.files[2].encoding === '7bit');
    assert(data.files[2].mime === 'application/javascript');
    assert(data.files[2].filepath.startsWith(app.config.multipart.tmpdir));
  });

  it('should 200 when file size just 10mb', async () => {
    const form = formstream();
    form.buffer('file', Buffer.alloc(10 * 1024 * 1024), '10mb.js', 'application/octet-stream');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form,
    });

    assert(res.status === 200);
    const data = JSON.parse(res.data);
    assert(data.files.length === 1);
    assert(data.files[0].field === 'file');
    assert(data.files[0].filename === '10mb.js');
    assert(data.files[0].encoding === '7bit');
    assert(data.files[0].mime === 'application/octet-stream');
    assert(data.files[0].filepath.startsWith(app.config.multipart.tmpdir));
    const stat = await fs.stat(data.files[0].filepath);
    assert(stat.size === 10 * 1024 * 1024);
  });

  it('should 200 when field size just 100kb', async () => {
    const form = formstream();
    form.field('foo', 'a'.repeat(100 * 1024));

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form,
    });

    assert(res.status === 200);
    const data = JSON.parse(res.data);
    assert(data.body.foo === 'a'.repeat(100 * 1024));
  });

  it('should 200 when request fields equal 10', async () => {
    const form = formstream();
    for (let i = 0; i < 10; i++) {
      form.field('foo' + i, 'a' + i);
    }

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form,
    });

    assert(res.status === 200);
    const data = JSON.parse(res.data);
    assert(Object.keys(data.body).length === 10);
  });

  it('should 200 when request files equal 10', async () => {
    const form = formstream();
    for (let i = 0; i < 10; i++) {
      form.file('foo' + i, __filename);
    }

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form,
    });

    assert(res.status === 200);
    const data = JSON.parse(res.data);
    assert(data.files.length === 10);
  });

  it('should throw error when request fields limit', async () => {
    const form = formstream();
    for (let i = 0; i < 11; i++) {
      form.field('foo' + i, 'a' + i);
    }

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form,
    });

    assert(res.status === 413);
    assert(res.data.toString().includes('Request_fields_limitError: Reach fields limit'));
  });

  it('should throw error when request files limit', async () => {
    const form = formstream();
    form.setMaxListeners(11);
    for (let i = 0; i < 11; i++) {
      form.file('foo' + i, __filename);
    }

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form,
    });

    assert(res.status === 413);
    assert(res.data.toString().includes('Request_files_limitError: Reach files limit'));
  });

  it('should throw error when request field size limit', async () => {
    const form = formstream();
    form.field('foo', 'a'.repeat(100 * 1024 + 1));

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form,
    });

    assert(res.status === 413);
    assert(res.data.toString().includes('Request_fieldSize_limitError: Reach fieldSize limit'));
  });

  // fieldNameSize is TODO on busboy
  // see https://github.com/mscdex/busboy/blob/master/lib/types/multipart.js#L5
  it.skip('should throw error when request field name size limit', async () => {
    const form = formstream();
    form.field('b'.repeat(101), 'a');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form,
    });

    assert(res.status === 413);
    assert(res.data.toString().includes('Request_fieldSize_limitError: Reach fieldSize limit'));
  });

  it('should throw error when request file size limit', async () => {
    const form = formstream();
    form.field('foo', 'fengmk2').field('love', 'egg');
    form.file('file1', __filename, 'foooooooo.js');
    form.file('file2', __filename);
    form.buffer('file3', Buffer.alloc(10 * 1024 * 1024 + 1), 'toobigfile.js', 'application/octet-stream');
    form.file('bigfile', path.join(__dirname, 'fixtures', 'bigfile.js'));
    // other form fields
    form.field('work', 'with Node.js');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form,
    });

    assert(res.status === 413);
    assert(res.data.toString().includes('Request_fileSize_limitError: Reach fileSize limit'));
  });

  it('should throw error when file name invalid', async () => {
    const form = formstream();
    form.field('foo', 'fengmk2').field('love', 'egg');
    form.file('file1', __filename, 'foooooooo.js.rar');
    form.file('file2', __filename);
    // other form fields
    form.field('work', 'with Node.js');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form,
    });

    assert(res.status === 400);
    assert(res.data.toString().includes('Error: Invalid filename: foooooooo.js.rar'));
  });

  it('should throw error on multipart() invoke twice', async () => {
    const form = formstream();
    form.field('foo', 'fengmk2').field('love', 'egg');
    form.file('file2', __filename);
    // other form fields
    form.field('work', 'with Node.js');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload?call_multipart_twice=1', {
      method: 'POST',
      headers,
      stream: form,
    });

    assert(res.status === 500);
    assert(res.data.toString().includes('TypeError: the multipart request can\'t be consumed twice'));
  });

  it('should use cleanupRequestFiles after request end', async () => {
    const form = formstream();
    form.field('foo', 'fengmk2').field('love', 'egg');
    form.file('file2', __filename);
    // other form fields
    form.field('work', 'with Node.js');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload?cleanup=true', {
      method: 'POST',
      headers,
      stream: form,
    });

    assert(res.status === 200);
    const data = JSON.parse(res.data);
    assert(data.files.length === 1);
  });

  it('should use cleanupRequestFiles in async way', async () => {
    const form = formstream();
    form.field('foo', 'fengmk2').field('love', 'egg');
    form.file('file2', __filename);
    // other form fields
    form.field('work', 'with Node.js');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload?async_cleanup=true', {
      method: 'POST',
      headers,
      stream: form,
    });

    assert(res.status === 200);
    const data = JSON.parse(res.data);
    assert(data.files.length === 1);
  });

  describe('schedule/clean_tmpdir', () => {
    it('should register clean_tmpdir schedule', () => {
      // [egg-schedule]: register schedule /hello/egg-multipart/app/schedule/clean_tmpdir.js
      const logger = app.loggers.scheduleLogger;
      const content = fs.readFileSync(logger.options.file, 'utf8');
      assert(/\[egg-schedule\]: register schedule .+clean_tmpdir\.js/.test(content));
    });

    it('should remove nothing', async () => {
      app.mockLog();
      await app.runSchedule(path.join(__dirname, '../app/schedule/clean_tmpdir'));
      app.expectLog('[egg-multipart:CleanTmpdir] start clean tmpdir: "', 'coreLogger');
      app.expectLog('[egg-multipart:CleanTmpdir] end', 'coreLogger');
    });

    it('should remove old dirs', async () => {
      const oldDirs = [
        path.join(app.config.multipart.tmpdir, moment().subtract(1, 'years').format('YYYY/MM/DD/HH')),
        path.join(app.config.multipart.tmpdir, moment().subtract(1, 'months').format('YYYY/MM/DD/HH')),
        path.join(app.config.multipart.tmpdir, moment().subtract(2, 'months').format('YYYY/MM/DD/HH')),
        path.join(app.config.multipart.tmpdir, moment().subtract(3, 'months').format('YYYY/MM/DD/HH')),
        path.join(app.config.multipart.tmpdir, moment().subtract(1, 'days').format('YYYY/MM/DD/HH')),
        path.join(app.config.multipart.tmpdir, moment().subtract(7, 'days').format('YYYY/MM/DD/HH')),
      ];
      const shouldKeepDirs = [
        path.join(app.config.multipart.tmpdir, moment().subtract(2, 'years').format('YYYY/MM/DD/HH')),
        path.join(app.config.multipart.tmpdir, moment().subtract(8, 'days').format('YYYY/MM/DD/HH')),
        path.join(app.config.multipart.tmpdir, moment().format('YYYY/MM/DD/HH')),
      ];
      const currentMonth = new Date().getMonth();
      const fourMonthBefore = path.join(app.config.multipart.tmpdir, moment().subtract(4, 'months').format('YYYY/MM/DD/HH'));
      if (currentMonth < 4) {
        // if current month is less than April, four months before shoule be last year.
        oldDirs.push(fourMonthBefore);
      } else {
        shouldKeepDirs.push(fourMonthBefore);
      }
      await Promise.all(oldDirs.map(dir => mkdirp(dir)));
      await Promise.all(shouldKeepDirs.map(dir => mkdirp(dir)));

      await Promise.all(oldDirs.map(dir => {
        // create files
        return fs.writeFile(path.join(dir, Date.now() + ''), new Date());
      }));

      app.mockLog();
      await app.runSchedule(path.join(__dirname, '../app/schedule/clean_tmpdir'));
      for (const dir of oldDirs) {
        const exists = await fs.exists(dir);
        assert(!exists, dir);
      }
      for (const dir of shouldKeepDirs) {
        const exists = await fs.exists(dir);
        assert(exists, dir);
      }
      app.expectLog('[egg-multipart:CleanTmpdir] removing tmpdir: "', 'coreLogger');
      app.expectLog('[egg-multipart:CleanTmpdir:success] tmpdir: "', 'coreLogger');
    });
  });
});
