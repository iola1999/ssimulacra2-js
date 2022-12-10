import sharp from "sharp";

export async function readImage(path: string) {
  const res = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  return res;
}
