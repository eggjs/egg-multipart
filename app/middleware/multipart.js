'use strict';

const pathMatching = require('egg-path-matching');

module.exports = options => {
  // normalize
  const matchFn = options.fileModeMatch && pathMatching({ match: options.fileModeMatch });

  return async function multipart(ctx, next) {
    if (!ctx.is('multipart')) return next();
    if (matchFn && !matchFn(ctx)) return next();
    // 临时目录支持一个函数
    if(typeof ctx.app.config.multipart.tmpdir === 'function') 
      ctx.app.config.multipart.tmpdir = await ctx.app.config.multipart.tmpdir(ctx);
    await ctx.saveRequestFiles();
    return next();
  };
};
