'use strict';

/**
 * multipart parser options
 * @member Config#multipart
 * @property {Boolean} autoFields - 默认为 false，field 和 file 通过 yield parts 获得
 * 如果设置为 true，所有 field 自动都会被自动处理，通过 parts.field 能访问到
 * @property {String} defaultCharset - 默认字符编码，除非你明确知道怎么使用，其他情况一律不用设置
 * @property {Integer} fieldNameSize - 单个 field 名称字节数上限，默认 100 bytes
 * @property {String} fieldSize - 单个 field 值字节数上限，默认 100 kb
 * @property {Integer} fields - 累加 field 个数上限，默认 10 个
 * @property {String} fileSize - 单个文件大小上限，默认为 10 mb
 * @property {Integer} files - 累加 文件个数上限，默认 10 个
 * @property {Array} whitelist - 应用可以覆盖内置的扩展名, 默认 null
 * @property {Array} fileExtensions - 应用可以添加更多扩展名拓展默认白名单列表, 默认 []，如果定义了 whitelist，这一参数失效。
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
