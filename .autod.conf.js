'use strict';

module.exports = {
  write: true,
  prefix: '^',
  test: [
    'test',
    'benchmark',
  ],
  devdep: [
    'autod',
    'egg',
    'egg-ci',
    'egg-bin',
    'eslint',
    'eslint-config-egg'
  ],
  exclude: [
    './test/fixtures',
  ],
}
