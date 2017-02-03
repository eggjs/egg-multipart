'use strict';

const parse = require('co-busboy');

module.exports = {
  /**
   * 创建 multipart parts 对象，可以分开获取上传数据
   * @method Context#multipart
   * @param {Object} [options] - 允许覆盖默认的 multipart 配置
   * @return {Yieldable} parts
   * @since 0.10.0
   */
  multipart(options) {
    // multipart/form-data
    if (!this.is('multipart')) {
      this.throw(400, 'Content-Type must be multipart/*');
    }
    const parseOptions = {};
    Object.assign(parseOptions, this.app.config.multipartParseOptions, options);
    return parse(this, parseOptions);
  },

  /**
   * 获取上传文件流
   * @example
   * ```js
   * const stream = yield this.getFileStream();
   * // 获取所有其他表单字段
   * console.log(stream.fields);
   * ```
   * @method Context#getFileStream
   * @return {ReadStream} stream
   * @since 1.0.0
   */
  * getFileStream() {
    const parts = this.multipart({ autoFields: true });
    const stream = yield parts;
    // 文件不存在，当做错误请求处理
    if (!stream || !stream.filename) {
      this.throw(400, 'Can\'t found upload file');
    }
    stream.fields = parts.field;
    return stream;
  },
};
