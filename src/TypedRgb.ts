import { ImageInfo } from "./type";
import { linearRgbToXyb, srgbToLinear } from "./util";

export class TypedRgb {
  data: Array<[number, number, number]>;
  width: number;
  height: number;

  constructor(
    imageInfo: ImageInfo,
    targetType: "linearRgb" | "xyb" = "linearRgb"
  ) {
    const {
      data,
      info,
      normalized = false,
      inputDataType = "sRgb",
    } = imageInfo;
    if (data.length !== info.width * info.height * 3)
      throw new Error("size not match");
    let linearResult: Array<[number, number, number]> = [];
    for (let i = 0; i < data.length; i += 3) {
      // 0~255 or 0~1
      let [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      if (!normalized) {
        // 归一化到 0~1
        [r, g, b] = [r / 255, g / 255, b / 255];
      }
      if (inputDataType === "sRgb") {
        // linear rgb
        [r, g, b] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
      }
      // transformPrimariesBT709 暂时省略
      linearResult.push([r, g, b]);
    }
    if (targetType === "linearRgb") {
      this.data = linearResult;
    } else {
      this.data = linearRgbToXyb(linearResult);
    }
    this.width = info.width;
    this.height = info.height;
  }
}
