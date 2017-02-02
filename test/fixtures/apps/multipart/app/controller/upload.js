'use strict';

const path = require('path');
const fs = require('fs');
const sendToWormhole = require('stream-wormhole');

module.exports = function* () {
  const parts = this.multipart();
  let part;
  while ((part = yield parts) != null) {
    if (Array.isArray(part)) {
      continue;
    } else {
      break;
    }
  }

  // 并没有文件被上传，这时候需要根据业务需要做针对性的处理
  // 例如 文件是必须字段，那么就报错
  // 这里只是给出提示
  if (!part || !part.filename) {
    this.body = {
      message: 'no file',
    };
    return;
  }

  if (this.query.mock_stream_error) {
    // mock save stream error
    const filepath = path.join(this.app.config.logger.dir, 'not-exists-dir/dir2/testfile');
    try {
      yield saveStream(part, filepath);
    } catch (err) {
      yield sendToWormhole(part);
      throw err;
    }

    this.body = {
      filename: part.filename,
    };
  }

  const filepath = path.join(this.app.config.logger.dir, 'multipart-test-file');
  yield saveStream(part, filepath);
  this.body = {
    filename: part.filename,
  };
};

function saveStream(stream, filepath) {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(filepath);
    stream.pipe(ws);
    ws.on('error', reject);
    ws.on('finish', resolve);
  });
}
