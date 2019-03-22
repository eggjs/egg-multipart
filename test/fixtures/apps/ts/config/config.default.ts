import { EggAppInfo, EggAppConfig, PowerPartial } from 'egg';

export default (appInfo: EggAppInfo) => {
  const config = {} as PowerPartial<EggAppConfig>;

  config.keys = 'multipart-ts-test';

  config.appInfo = appInfo;

  config.multipart = {
    mode: 'file',
  };
  
  return config;
}