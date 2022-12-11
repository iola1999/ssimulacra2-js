import sharp from "sharp";

export interface ImageInfo {
  data: Buffer | Array<number>;
  info: {
    width: number;
    height: number;
  } & Partial<sharp.OutputInfo>;
  // is normalized to range 0~1
  normalized?: boolean;
  inputDataType?: "sRgb" | "linearRgb";
}

export type ImageRgbPlanar = [number[], number[], number[]];
