import sharp from "sharp";
import { ImageInfo } from "./type";

export class LinearRgb {
  data: Array<[number, number, number]>;
  width: number;
  height: number;
  constructor(imageInfo: ImageInfo) {
    const { data, info } = imageInfo;
    if (data.length !== info.width * info.height * 3)
      throw new Error("size not match");
    const result: Array<[number, number, number]> = [];
    for (let i = 0; i < data.length; i += 3) {
      result.push([data[i], data[i + 1], data[i + 2]]);
    }
    this.data = result;
    this.width = info.width;
    this.height = info.height;
  }
}
