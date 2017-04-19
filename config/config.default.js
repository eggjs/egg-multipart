'use strict';

/**
 * multipart parser options
 * @member Config#multipart
 * @property {Boolean} autoFields - Auto set fields to parts, default is `false`.
 *   If set true，all fields will be auto handle and can acces by `parts.fields`
 * @property {String} defaultCharset - Default charset encoding, don't change it before you real know about it
 * @property {Integer} fieldNameSize - Max field name size (in bytes), default is `100`
 * @property {String|Integer} fieldSize - Max field value size (in bytes), default is `100kb`
 * @property {Integer} fields - Max number of non-file fields, default is `10`
 * @property {String|Integer} fileSize - Max file size (in bytes), default is `10mb`
 * @property {Integer} files - Max number of file fields, default is `10`
 * @property {Array|Function} whitelist - The white ext file names, default is `null`
 * @property {Array} fileExtensions - Add more ext file names to the `whitelist`, default is `[]`
 */
exports.multipart = {
  autoFields: false,
  defaultCharset: 'utf8',
  fieldNameSize: 100,
  fieldSize: '100kb',
  fields: 10,
  fileSize: '10mb',
  files: 10,
  fileExtensions: [],
  whitelist: null,
};
