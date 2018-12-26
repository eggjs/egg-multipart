
2.4.0 / 2018-12-26
==================

**features**
  * [[`d7504b9`](http://github.com/eggjs/egg-multipart/commit/d7504b9635c68184181c751212c30a6eb53f87fe)] - feat: custom multipart parse options per request (#27) (fengmk2 <<fengmk2@gmail.com>>)

2.3.0 / 2018-11-11
==================

**features**
  * [[`8d63cea`](http://github.com/eggjs/egg-multipart/commit/8d63cea48134d4d2a69796a399f04117222efd70)] - feat: export ctx.cleanupRequestFiles to improve cleanup more easy (#22) (fengmk2 <<fengmk2@gmail.com>>)

2.2.1 / 2018-09-29
==================

  * chore: fix egg docs build (#21)
  * chore: add azure pipelines badge

2.2.0 / 2018-09-29
==================

**features**
  * [[`75c0733`](http://github.com/eggjs/egg-multipart/commit/75c0733bcbb68349970b5d2bb189bf8822954337)] - feat: Provide `file` mode to handle multipart request (#19) (fengmk2 <<fengmk2@gmail.com>>)

**others**
  * [[`0b4e118`](http://github.com/eggjs/egg-multipart/commit/0b4e118a8eef3e61262fb981999cc2173dc08cc3)] - chore: no need to consume stream on error throw (#18) (fengmk2 <<fengmk2@gmail.com>>)

2.1.0 / 2018-08-07
==================

**features**
  * [[`5ece18a`](http://github.com/eggjs/egg-multipart/commit/5ece18abd0a1026fa742e15a7480010619156051)] - feat: getFileStream() can accept non file request (#17) (fengmk2 <<fengmk2@gmail.com>>)

2.0.0 / 2017-11-10
==================

**others**
  * [[`6a7fa06`](http://github.com/eggjs/egg-multipart/commit/6a7fa06d8978d061950d339cdd685b1ace6995c3)] - refactor: use async function and support egg@2 (#15) (Yiyu He <<dead_horse@qq.com>>)

1.5.1 / 2017-10-27
==================

**fixes**
  * [[`a7778e5`](http://github.com/eggjs/egg-multipart/commit/a7778e58f603c5efe298c8a651356d203afefed0)] - fix: fileSize typo (#10) (tangyao <<2001-wms@163.com>>)

**others**
  * [[`f95e322`](http://github.com/eggjs/egg-multipart/commit/f95e32287570f8f79de3061abfdfcbc93823f44f)] - docs: add more example (#14) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`b0785e3`](http://github.com/eggjs/egg-multipart/commit/b0785e34bb68b18af0d9f50bc3bf40cb91987391)] - docs: s/extention/extension (#13) (Sen Yang <<jasonslyvia@users.noreply.github.com>>)
  * [[`d67fcf5`](http://github.com/eggjs/egg-multipart/commit/d67fcf5b64d0252345e04325c170e14786bc55a4)] - test: improve code coverage (#12) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`c8b77df`](http://github.com/eggjs/egg-multipart/commit/c8b77dfa9ad44dace89ef62531f182a4960843f6)] - test: fix failing test (#11) (Haoliang Gao <<sakura9515@gmail.com>>)

1.5.0 / 2017-06-09
==================

  * refactor: always log when exceed limt (#9)

1.4.0 / 2017-05-18
==================

  * feat: Add upper case extname support (#7)

1.3.0 / 2017-04-21
==================

  * feat: whitelist support fn && english readme (#6)

1.2.0 / 2017-03-18
==================

  * feat: should emit stream error event when file too large (#5)
  * deps: upgrade all dev deps (#4)

1.1.0 / 2017-02-08
==================

  * feat: getFileStream return promise (#3)

1.0.0 / 2016-08-02
==================

 * init version
