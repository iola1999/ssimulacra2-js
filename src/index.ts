import { LinearRgb } from "./LinearRgb";
import { readImage } from "./util";

async function compute_frame_ssimulacra2(
  sourceImgPath1: string,
  sourceImgPath2: string
) {
  const imageInfo1 = await readImage(sourceImgPath1);
  const imageInfo2 = await readImage(sourceImgPath2);
  const img1 = new LinearRgb(imageInfo1);
  const img2 = new LinearRgb(imageInfo2);
  if (img1.width !== img2.width || img1.height !== img2.height)
    throw new Error(
      "Source and distorted image width and height must be equal"
    );
  const { width, height } = img1;
  if (width < 8 || height < 8)
    throw new Error("Images must be at least 8x8 pixels");

  let mul = [
    new Float32Array(width * height),
    new Float32Array(width * height),
    new Float32Array(width * height),
  ];
}

export { compute_frame_ssimulacra2 };
