'use strict';

module.exports = async ctx => {
  ctx.body = {
    body: ctx.request.body,
    files: ctx.request.files,
  };

  if (ctx.query.call_multipart_twice) {
    ctx.multipart();
  }
};
