'use strict';

const { normalizeOptions } = require('./lib/utils');

module.exports = class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  configWillLoad() {
    this.app.config.multipart = normalizeOptions(this.app.config.multipart);
    const options = this.app.config.multipart;

    this.app.coreLogger.info('[egg-multipart] %s mode enable', options.mode);
    if (options.mode === 'file' || options.fileModeMatch) {
      this.app.coreLogger.info('[egg-multipart] will save temporary files to %j, cleanup job cron: %j', options.tmpdir, options.cleanSchedule.cron);
      // enable multipart middleware
      this.app.config.coreMiddleware.push('multipart');
    }
  }
};

