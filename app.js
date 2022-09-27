'use strict';

const { normalizeOptions } = require('./lib/utils');

module.exports = class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  configWillLoad() {
    const options = normalizeOptions(this.app.config.multipart);

    this.app.coreLogger.info('[egg-multipart] %s mode enable', options.mode);
    if (options.mode === 'file' || options.fileModeMatch) {
      this.app.coreLogger.info('[egg-multipart] will save temporary files to %j, cleanup job cron: %j', options.tmpdir, options.cleanSchedule.cron);
      // enable multipart middleware
      this.app.config.coreMiddleware.push('multipart');
    }

    // https://github.com/mscdex/busboy#busboy-methods
    this.app.config.multipartParseOptions = {
      autoFields: options.autoFields,
      defCharset: options.defaultCharset,
      defParamCharset: options.defaultParamCharset,
      limits: {
        fieldNameSize: options.fieldNameSize,
        fieldSize: options.fieldSize,
        fields: options.fields,
        fileSize: options.fileSize,
        files: options.files,
      },
      // check if extname in the whitelist
      checkFile: options.checkFile,
    };
  }
};

