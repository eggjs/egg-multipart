'use strict';

module.exports = options => {
  return async function multipart(ctx, next) {
    if (!ctx.is('multipart')) return next();
    if (options.fileModeMatch && !options.fileModeMatch.test(ctx.path)) return next();

    await ctx.saveRequestFiles();
    return next();
  };
};
