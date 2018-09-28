'use strict';

const assert = require('assert');
const mock = require('egg-mock');

describe('test/wrong-mode.test.js', () => {
  it('should start fail', () => {
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
});
