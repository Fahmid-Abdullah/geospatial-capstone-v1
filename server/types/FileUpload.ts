export type FileUpload = {
  filename: string;
  mimetype: string;
  encoding: string;
  createReadStream: () => NodeJS.ReadableStream;
};

export type GraphQLUpload = {
  resolve: Function;
  reject: Function;
  promise: Promise<FileUpload>;
  file?: FileUpload;
};

