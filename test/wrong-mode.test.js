'use strict';

const assert = require('assert');
const mock = require('egg-mock');

describe('test/wrong-mode.test.js', () => {
  it('should start fail when mode=foo', () => {
    const app = mock.app({
      baseDir: 'apps/wrong-mode',
    });
    return app.ready()
      .then(() => {
        throw new Error('should not run this');
      }, err => {
        assert(err.name === 'TypeError');
        assert(err.message === 'Expect mode to be \'stream\' or \'file\', but got \'foo\'');
      });
  });

  it('should start fail when using options.fileModeMatch on file mode', () => {
    const app = mock.app({
      baseDir: 'apps/wrong-fileModeMatch',
    });
    return app.ready()
      .then(() => {
        throw new Error('should not run this');
      }, err => {
        assert(err.name === 'TypeError');
        assert(err.message === '`fileModeMatch` options only work on stream mode, please remove it');
      });
  });

  it('should start fail when using options.fileModeMatch is not RegExp', () => {
    const app = mock.app({
      baseDir: 'apps/wrong-fileModeMatch-value',
    });
    return app.ready()
      .then(() => {
        throw new Error('should not run this');
      }, err => {
        assert(err.name === 'AssertionError');
        assert(err.message === '`fileModeMatch` options should be an instance of RegExp');
      });
  });
});
