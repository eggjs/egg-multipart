'use strict';

const bytes = require('humanize-bytes');
const path = require('path');
const assert = require('assert');


exports.whitelist = [
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

exports.normalizeOptions = options => {
  // make sure to cast the value of config **Size to number
  options.fileSize = bytes(options.fileSize);
  options.fieldSize = bytes(options.fieldSize);
  options.fieldNameSize = bytes(options.fieldNameSize);

  // validate mode
  options.mode = options.mode || 'stream';
  assert([ 'stream', 'file' ].includes(options.mode), `Expect mode to be 'stream' or 'file', but got '${options.mode}'`);
  if (options.mode === 'file') assert(!options.fileModeMatch, '`fileModeMatch` options only work on stream mode, please remove it');

  // normalize whitelist
  if (Array.isArray(options.whitelist)) options.whitelist = options.whitelist.map(extname => extname.toLowerCase());

  // normalize fileExtensions
  if (Array.isArray(options.fileExtensions)) {
    options.fileExtensions = options.fileExtensions.map(extname => {
      return (extname.startsWith('.') || extname === '') ? extname.toLowerCase() : `.${extname.toLowerCase()}`;
    });
  }

  function checkExt(fileName) {
    if (typeof options.whitelist === 'function') return options.whitelist(fileName);
    const extname = path.extname(fileName).toLowerCase();
    if (Array.isArray(options.whitelist)) return options.whitelist.includes(extname);
    // only if user don't provide whitelist, we will use default whitelist + fileExtensions
    return exports.whitelist.includes(extname) || options.fileExtensions.includes(extname);
  }

  options.checkFile = (fieldName, fileStream, fileName) => {
    // just ignore, if no file
    if (!fileStream || !fileName) return null;
    try {
      if (!checkExt(fileName)) {
        const err = new Error('Invalid filename: ' + fileName);
        err.status = 400;
        return err;
      }
    } catch (err) {
      err.status = 400;
      return err;
    }
  };

  return options;
};
