'use strict';

const bytes = require('humanize-bytes');
const path = require('path');

module.exports = app => {
  const options = app.config.multipart;
  // make sure to cast the value of config **Size to number
  for (const key in options) {
    if (/^\w+Size$/.test(key)) {
      options[key] = bytes(options[key]);
    }
  }

  // default extname whitelist
  let whitelist = [
    // images
    '.jpg', '.jpeg', // image/jpeg
    '.png', // image/png, image/x-png
    '.gif', // image/gif
    '.bmp', // image/bmp
    '.wbmp', // image/vnd.wap.wbmp
    '.webp',
    '.tif',
    '.psd',
    // text
    '.svg',
    '.js', '.jsx',
    '.json',
    '.css', '.less',
    '.html', '.htm',
    '.xml',
    // tar
    '.zip',
    '.gz', '.tgz', '.gzip',
    // video
    '.mp3',
    '.mp4',
    '.avi',
  ];

  if (options.whitelist) {
    whitelist = options.whitelist;
  } else if (options.fileExtensions.length > 0) {
    whitelist = whitelist.concat(options.fileExtensions);
  }

  // https://github.com/mscdex/busboy#busboy-methods
  app.config.multipartParseOptions = {
    autoFields: options.autoFields,
    defCharset: options.defaultCharset,
    limits: {
      fieldNameSize: options.fieldNameSize,
      fieldSize: options.fieldSize,
      fields: options.fields,
      fileSize: options.fileSize,
      files: options.files,
    },
    // check if extname in the whitelist
    checkFile(fieldname, fileStream, filename) {
      // just ignore, if no file
      if (!fileStream || !filename) return null;

      const extname = path.extname(filename);
      if (!extname || whitelist.indexOf(extname.toLowerCase()) === -1) {
        const err = new Error('Invalid filename extension: ' + extname);
        err.status = 400;
        return err;
      }
    },
  };
};
