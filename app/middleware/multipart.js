const pathMatching = require('egg-path-matching');

module.exports = (options, app) => {
  // normalize
  const matchFn = options.fileModeMatch && pathMatching({
    match: options.fileModeMatch,
    pathToRegexpModule: app.options.pathToRegexpModule,
  });

  return async function multipart(ctx, next) {
    if (!ctx.is('multipart')) return next();
    if (matchFn && !matchFn(ctx)) return next();

    await ctx.saveRequestFiles();
    return next();
  };
};
