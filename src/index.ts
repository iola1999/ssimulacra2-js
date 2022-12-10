import { Blur } from "./Blur";
import { LinearRgb } from "./LinearRgb";
import { Msssim, MsssimScale } from "./Mssim";
import { readImage } from "./util";
import { ImageRgbPlanar } from "./type";

const NUM_SCALES = 6;

async function compute_frame_ssimulacra2(
  sourceImgPath1: string,
  sourceImgPath2: string
) {
  const imageInfo1 = await readImage(sourceImgPath1);
  const imageInfo2 = await readImage(sourceImgPath2);
  let img1 = new LinearRgb(imageInfo1);
  let img2 = new LinearRgb(imageInfo2);
  if (img1.width !== img2.width || img1.height !== img2.height)
    throw new Error(
      "Source and distorted image width and height must be equal"
    );
  let { width, height } = img1;
  if (width < 8 || height < 8)
    throw new Error("Images must be at least 8x8 pixels");

  const mul: ImageRgbPlanar = [
    new Array(width * height),
    new Array(width * height),
    new Array(width * height),
  ];

  const blur = new Blur(width, height);
  const msssim = new Msssim();

  for (let scale = 0; scale < NUM_SCALES; scale++) {
    if (width < 8 || height < 8) break;
    if (scale > 0) {
      img1 = downscale_by_2(img1);
      img2 = downscale_by_2(img2);
      width = img1.width;
      height = img1.height;
    }
    for (let index = 0; index < mul.length; index++) {
      mul[index].length = width * height;
    }
    blur.shrink_to(width, height);
    // 可能不用复制？
    let img1Clone = new LinearRgb({
      data: img1.data.flat(),
      info: {
        width: img1.width,
        height: img1.height,
      },
    });
    let img2Clone = new LinearRgb({
      data: img2.data.flat(),
      info: {
        width: img2.width,
        height: img2.height,
      },
    });

    // 可能不用接收返回值？
    img1Clone = make_positive_xyb(img1Clone);
    img2Clone = make_positive_xyb(img2Clone);

    // SSIMULACRA2 works with the data in a planar format,
    // so we need to convert to that.
    const img1Planar = xyb_to_planar(img1Clone);
    const img2Planar = xyb_to_planar(img2Clone);

    image_multiply(img1Planar, img1Planar, mul);
    let sigma1_sq = blur.blur(mul);

    image_multiply(img2Planar, img2Planar, mul);
    let sigma2_sq = blur.blur(mul);

    image_multiply(img1Planar, img2Planar, mul);
    let sigma12 = blur.blur(mul);

    let mu1 = blur.blur(img1Planar);
    let mu2 = blur.blur(img1Planar);

    let avg_ssim = ssim_map(
      width,
      height,
      mu1,
      mu2,
      sigma1_sq,
      sigma2_sq,
      sigma12
    );
    let avg_edgediff = edge_diff_map(
      width,
      height,
      img1Planar,
      mu1,
      img2Planar,
      mu2
    );
    msssim.scales.push(new MsssimScale(avg_ssim, avg_edgediff));
  }
  msssim.score();
}

function downscale_by_2(_in_data: LinearRgb) {
  const SCALE = 2;
  const in_w = _in_data.width;
  const in_h = _in_data.height;
  const out_w = Math.floor((in_w + SCALE - 1) / SCALE);
  const out_h = Math.floor((in_h + SCALE - 1) / SCALE);
  const out_data = Array(out_w * out_h);
  for (let index = 0; index < out_data.length; index++) {
    out_data[index] = [0, 0, 0];
  }
  const normalize = 1 / (SCALE * SCALE);

  let in_data = _in_data.data;

  for (let oy = 0; oy < out_h; oy++) {
    for (let ox = 0; ox < out_w; ox++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let iy = 0; iy < SCALE; iy++) {
          for (let ix = 0; ix < SCALE; ix++) {
            const x = Math.min(ox * SCALE + ix, in_w - 1);
            const y = Math.min(oy * SCALE + iy, in_h - 1);
            const in_pix = in_data[y * in_w + x];

            sum += in_pix[c];
          }
        }
        const out_pix = out_data[oy * out_w + ox];
        out_pix[c] = sum * normalize;
      }
    }
  }

  return new LinearRgb({
    data: out_data.flat(),
    info: {
      width: out_w,
      height: out_h,
    },
  });
}

function make_positive_xyb(xyb: LinearRgb) {
  for (let index = 0; index < xyb.data.length; index++) {
    xyb.data[index][2] += 1.1 - xyb.data[index][1];
    xyb.data[index][0] += 0.5;
    xyb.data[index][1] += 0.05;
  }
  return xyb;
}

// 将每个像素的 rgb 分别存到三个数组
function xyb_to_planar(xyb: LinearRgb) {
  const out1 = Array<number>(xyb.width * xyb.height).fill(0);
  const out2 = Array<number>(xyb.width * xyb.height).fill(0);
  const out3 = Array<number>(xyb.width * xyb.height).fill(0);
  for (let index = 0; index < xyb.data.length; index++) {
    out1[index] = xyb.data[index][0];
    out2[index] = xyb.data[index][1];
    out3[index] = xyb.data[index][2];
  }
  return [out1, out2, out3] as ImageRgbPlanar;
}

function image_multiply(
  img1: ImageRgbPlanar,
  img2: ImageRgbPlanar,
  out: ImageRgbPlanar
) {
  //   for (let i = 0; i < img1.length; i++) {
  //     for (let j = 0; j < img1[i].length; j++) {
  //       out[i][j] = img1[i][j] * img2[i][j];
  //     }
  //   }

  // TODO 这个逻辑是否一致待确认
  for (let i = 0; i < img1.length; i++) {
    const plane1 = img1[i];
    const plane2 = img2[i];
    const outPlane = out[i];

    for (let j = 0; j < plane1.length; j++) {
      outPlane[j] = plane1[j] * plane2[j];
    }
  }
}

function ssim_map(
  width: number,
  height: number,
  m1: ImageRgbPlanar,
  m2: ImageRgbPlanar,
  s11: ImageRgbPlanar,
  s22: ImageRgbPlanar,
  s12: ImageRgbPlanar
) {
  // TODO
  return new Array(6).fill(0);
}

function edge_diff_map(
  width: number,
  height: number,
  img1: ImageRgbPlanar,
  mu1: ImageRgbPlanar,
  img2: ImageRgbPlanar,
  mu2: ImageRgbPlanar
) {
  // TODO
  return new Array(12).fill(0);
}

export { compute_frame_ssimulacra2 };
