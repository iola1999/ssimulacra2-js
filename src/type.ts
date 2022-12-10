import sharp from "sharp";

export interface ImageInfo {
  data: Buffer;
  info: sharp.OutputInfo;
}
