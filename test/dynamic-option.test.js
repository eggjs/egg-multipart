'use strict';

const assert = require('assert');
const formstream = require('formstream');
const urllib = require('urllib');
const mock = require('egg-mock');
const fs = require('fs').promises;

describe('test/dynamic-option.test.js', () => {
  let app;
  let server;
  let host;
  before(() => {
    app = mock.app({
      baseDir: 'apps/dynamic-option',
    });
    return app.ready();
  });
  before(() => {
    server = app.listen();
    host = 'http://127.0.0.1:' + server.address().port;
  });
  after(() => {
    return fs.rm(app.config.multipart.tmpdir, { force: true, recursive: true });
  });
  after(() => app.close());
  after(() => server.close());
  beforeEach(() => app.mockCsrf());
  afterEach(mock.restore);

  it('should work with saveRequestFiles options', async () => {
    const form = formstream();
    form.buffer('file', Buffer.alloc(1 * 1024 * 1024), '1mb.js', 'application/octet-stream');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form,
    });

    assert(res.status === 413);
    assert(res.data.toString().includes('Request_fileSize_limitError: Reach fileSize limit'));
  });
});
