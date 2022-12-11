import { ImageInfo } from "./type";
import { linearRgbToXyb, srgbToLinear } from "./util";

export class LinearRgb {
  data: Array<[number, number, number]>;
  width: number;
  height: number;

  constructor(imageInfo: ImageInfo) {
    const { data, info } = imageInfo;
    if (data.length !== info.width * info.height * 3)
      throw new Error("size not match");
    let result: Array<[number, number, number]> = [];
    for (let i = 0; i < data.length; i += 3) {
      // 0~255
      let [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      // linear rgb
      [r, g, b] = srgbToLinear(r, g, b);
      // transformPrimariesBT709 省略
      result.push([r, g, b]);
    }
    // 应该直接调用就行，不用接收返回值
    result = linearRgbToXyb(result);
    this.data = result;
    this.width = info.width;
    this.height = info.height;
  }
}
