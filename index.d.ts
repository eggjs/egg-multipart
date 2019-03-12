interface EggFile {
  field: string;
  filename: string;
  encoding: string;
  mime: string;
  filepath: string;
}

declare module 'egg' {
  interface Request {
    files: EggFile[];
  }
}
