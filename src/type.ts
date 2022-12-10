import sharp from "sharp";

export interface ImageInfo {
  data: Buffer | Array<number>;
  info: {
    width: number;
    height: number;
  } & Partial<sharp.OutputInfo>;
}

export type ImageRgbPlanar = [number[], number[], number[]];
