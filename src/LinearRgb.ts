import { ImageInfo } from "./type";
import { linearRgbToXyb, srgbToLinear } from "./util";

export class LinearRgb {
  data: Array<[number, number, number]>;
  xybData: Array<[number, number, number]>;
  width: number;
  height: number;

  constructor(imageInfo: ImageInfo) {
    const { data, info, normalized = false, type = "sRgb" } = imageInfo;
    if (data.length !== info.width * info.height * 3)
      throw new Error("size not match");
    let linearResult: Array<[number, number, number]> = [];
    let xybResult: Array<[number, number, number]> = [];
    for (let i = 0; i < data.length; i += 3) {
      // 0~255 or 0~1
      let [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      if (!normalized) {
        // 归一化到 0~1
        [r, g, b] = [r / 255, g / 255, b / 255];
      }
      if (type === "sRgb") {
        // linear rgb
        [r, g, b] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
      }
      // transformPrimariesBT709 省略
      linearResult.push([r, g, b]);
      xybResult.push([r, g, b]);
    }
    this.data = linearResult;
    // 直接调用即可，不用接收返回值
    xybResult = linearRgbToXyb(xybResult);
    this.xybData = xybResult;
    this.width = info.width;
    this.height = info.height;
  }
}
