'use strict';

const path = require('path');
const fs = require('fs');

// keep one generator function test case
module.exports = function* () {
  const parts = this.multipart();
  let part;
  while ((part = yield parts()) != null) {
    if (Array.isArray(part)) {
      continue;
    } else {
      break;
    }
  }

  const ws = fs.createWriteStream(path.join(this.app.config.logger.dir, 'multipart-test-file'));
  part.pipe(ws);
  this.body = {
    filename: part.filename,
  };
};
