'use strict';

exports.multipart = {
  fileExtensions: [ '.foo' ],
  whitelist: filename => filename === 'bar',
};

exports.keys = 'multipart';
