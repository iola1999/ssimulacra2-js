import sharp from "sharp";

export async function readImage(path: string) {
  const res = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  return res;
}

const SRGB_ALPHA = 1.055_010_7;
const SRGB_BETA = 0.003_041_282_5;

function someTransfer(x: number) {
  x = Math.max(0, x);
  if (x < 12.92 * SRGB_BETA) {
    return x / 12.92;
  } else {
    return Math.pow((x + (SRGB_ALPHA - 1.0)) / SRGB_ALPHA, 2.4);
  }
}

export function srgbToLinear(r: number, g: number, b: number) {
  // 将 RGB 值转换为 0 到 1 之间的浮点数
  r /= 255;
  g /= 255;
  b /= 255;

  return [someTransfer(r), someTransfer(g), someTransfer(b)];
}

function transformPrimariesBT709(r: number, g: number, b: number) {
  // 默认都是的话就不转了 yuvrgb 的实现：
  //   if in_primaries == out_primaries {
  //     return Ok(input);
  // }
  // let transform = gamut_xyz_to_rgb_matrix(out_primaries)?
  //       * white_point_adaptation_matrix(in_primaries, out_primaries)
  //       * gamut_rgb_to_xyz_matrix(in_primaries)?;
  //   for pix in &mut input {
  //       let pix_matrix = Matrix3x1::from_column_slice(pix);
  //       let res = transform * pix_matrix;
  //       pix[0] = res[0];
  //       pix[1] = res[1];
  //       pix[2] = res[2];
  //   }
}

const K_M02 = 0.078;
const K_M00 = 0.3;
const K_M01 = 1.0 - K_M02 - K_M00;

const K_M12 = 0.078;
const K_M10 = 0.23;
const K_M11 = 1.0 - K_M12 - K_M10;

const K_M20 = 0.243_422_69;
const K_M21 = 0.204_767_45;
const K_M22 = 1.0 - K_M20 - K_M21;

const K_B0 = 0.003_793_073_4;
const K_B1 = K_B0;
const K_B2 = K_B0;

const OPSIN_ABSORBANCE_MATRIX = [
  K_M00,
  K_M01,
  K_M02,
  K_M10,
  K_M11,
  K_M12,
  K_M20,
  K_M21,
  K_M22,
];
const OPSIN_ABSORBANCE_BIAS = [K_B0, K_B1, K_B2];
const INVERSE_OPSIN_ABSORBANCE_MATRIX = [
  11.031_567, -9.866_944, -0.164_622_99, -3.254_147_3, 4.418_770_3,
  -0.164_622_99, -3.658_851_4, 2.712_923, 1.945_928_2,
];
const NEG_OPSIN_ABSORBANCE_BIAS = [-K_B0, -K_B1, -K_B2];

function opsinAbsorbance(rgb: [number, number, number]) {
  let out = [0, 0, 0];
  out[0] =
    OPSIN_ABSORBANCE_MATRIX[0] * rgb[0] +
    OPSIN_ABSORBANCE_MATRIX[1] * rgb[1] +
    OPSIN_ABSORBANCE_MATRIX[2] * rgb[2] +
    OPSIN_ABSORBANCE_BIAS[0];
  out[1] =
    OPSIN_ABSORBANCE_MATRIX[3] * rgb[0] +
    OPSIN_ABSORBANCE_MATRIX[4] * rgb[1] +
    OPSIN_ABSORBANCE_MATRIX[5] * rgb[2] +
    OPSIN_ABSORBANCE_BIAS[1];
  out[2] =
    OPSIN_ABSORBANCE_MATRIX[6] * rgb[0] +
    OPSIN_ABSORBANCE_MATRIX[7] * rgb[1] +
    OPSIN_ABSORBANCE_MATRIX[8] * rgb[2] +
    OPSIN_ABSORBANCE_BIAS[2];
  return out as [number, number, number];
}

function mixedToXyb(mixed: [number, number, number]) {
  let out = [0, 0, 0];
  out[0] = 0.5 * (mixed[0] - mixed[1]);
  out[1] = 0.5 * (mixed[0] + mixed[1]);
  out[2] = mixed[2];
  return out as [number, number, number];
}

export function linearRgbToXyb(input: [number, number, number][]) {
  let absorbanceBias = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    absorbanceBias[i] = -Math.cbrt(OPSIN_ABSORBANCE_BIAS[i]);
  }

  for (let i = 0; i < input.length; i++) {
    let mixed = opsinAbsorbance(input[i]);
    for (let j = 0; j < 3; j++) {
      if (mixed[j] < 0) {
        mixed[j] = 0;
      }
      mixed[j] = Math.cbrt(mixed[j]) + absorbanceBias[j];
    }

    input[i] = mixedToXyb(mixed);
  }

  return input;
}
