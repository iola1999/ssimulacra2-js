import { Blur } from "./Blur";
import { TypedRgb } from "./TypedRgb";
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
  let img1 = new TypedRgb(imageInfo1);
  let img2 = new TypedRgb(imageInfo2);
  if (img1.width !== img2.width || img1.height !== img2.height)
    throw new Error(
      "Source and distorted image width and height must be equal"
    );
  let { width, height } = img1;
  if (width < 8 || height < 8)
    throw new Error("Images must be at least 8x8 pixels");

  const mul: ImageRgbPlanar = [
    new Array(width * height).fill(0),
    new Array(width * height).fill(0),
    new Array(width * height).fill(0),
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
    const img1Clone = new TypedRgb(
      {
        data: img1.data.flat(),
        info: {
          width: img1.width,
          height: img1.height,
        },
        normalized: true,
        inputDataType: "linearRgb",
      },
      "xyb"
    );
    const img2Clone = new TypedRgb(
      {
        data: img2.data.flat(),
        info: {
          width: img2.width,
          height: img2.height,
        },
        normalized: true,
        inputDataType: "linearRgb",
      },
      "xyb"
    );

    make_positive_xyb(img1Clone);
    make_positive_xyb(img2Clone);

    // SSIMULACRA2 works with the data in a planar format,
    // so we need to convert to that.
    const img1_planar = xyb_to_planar(img1Clone);
    const img2_planar = xyb_to_planar(img2Clone);

    image_multiply(img1_planar, img1_planar, mul);
    const sigma1_sq = blur.blur(mul);

    image_multiply(img2_planar, img2_planar, mul);
    const sigma2_sq = blur.blur(mul);

    image_multiply(img1_planar, img2_planar, mul);
    const sigma12 = blur.blur(mul);

    const mu1 = blur.blur(img1_planar);
    const mu2 = blur.blur(img1_planar);

    const avg_ssim = ssim_map(
      width,
      height,
      mu1,
      mu2,
      sigma1_sq,
      sigma2_sq,
      sigma12
    );
    const avg_edgediff = edge_diff_map(
      width,
      height,
      img1_planar,
      mu1,
      img2_planar,
      mu2
    );
    msssim.scales.push(new MsssimScale(avg_ssim, avg_edgediff));
  }
  return msssim.score();
}

function downscale_by_2(_in_data: TypedRgb) {
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

  const in_data = _in_data.data;

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

  return new TypedRgb(
    {
      data: out_data.flat(),
      info: {
        width: out_w,
        height: out_h,
      },
      normalized: true,
      inputDataType: "linearRgb",
    },
    "xyb"
  );
}

function make_positive_xyb(xyb: TypedRgb) {
  for (let index = 0; index < xyb.data.length; index++) {
    xyb.data[index][2] += 1.1 - xyb.data[index][1];
    xyb.data[index][0] += 0.5;
    xyb.data[index][1] += 0.05;
  }
}

// 将每个像素的 rgb 分别存到三个数组
function xyb_to_planar(xyb: TypedRgb) {
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

function zip(...arrays: any[]) {
  const length = Math.min(...arrays.map((array) => array.length));
  return Array.from({ length }, (_, index) =>
    arrays.map((array) => array[index])
  );
}

(Array.prototype as any).chunks_exact = function (size: number) {
  const length = Math.floor(this.length / size);
  return Array.from({ length }, (_, index) =>
    this.slice(index * size, index * size + size)
  );
};

(Array.prototype as any).zip = function (...arrays: any[]) {
  return zip(this, ...arrays);
};

function ssim_map(
  width: number,
  height: number,
  m1: ImageRgbPlanar,
  m2: ImageRgbPlanar,
  s11: ImageRgbPlanar,
  s22: ImageRgbPlanar,
  s12: ImageRgbPlanar
) {
  const C2 = 0.0009;

  const one_per_pixels = 1 / (width * height);
  const plane_averages = new Array(6).fill(0);

  for (let c = 0; c < 3; c++) {
    const sum1 = [0, 0];
    // TODO 确认此段逻辑是否一致
    for (const [row_m1, [row_m2, [row_s11, [row_s22, row_s12]]]] of zip(
      // @ts-ignore
      m1[c].chunks_exact(width),
      m2[c]
        // @ts-ignore
        .chunks_exact(width)
        .zip(
          s11[c]
            // @ts-ignore
            .chunks_exact(width)
            // @ts-ignore
            .zip(s22[c].chunks_exact(width).zip(s12[c].chunks_exact(width)))
        )
    )) {
      for (let x = 0; x < width; x++) {
        const mu1 = row_m1[x];
        const mu2 = row_m2[x];
        const mu11 = mu1 * mu1;
        const mu22 = mu2 * mu2;
        const mu12 = mu1 * mu2;
        // 此处有偏差
        const mu_diff = mu1 - mu2;
        const num_m = mu_diff * -mu_diff + 1.0;
        const num_s = 2 * (row_s12[x] - mu12) + C2;
        const denom_s = row_s11[x] - mu11 + (row_s22[x] - mu22) + C2;
        let d = 1.0 - (num_m * num_s) / denom_s;
        d = Math.max(d, 0.0);
        sum1[0] += d;
        sum1[1] += d ** 4;
      }
    }
    // TODO 值偏差较大
    plane_averages[c * 2] = one_per_pixels * sum1[0];
    plane_averages[c * 2 + 1] = (one_per_pixels * sum1[1]) ** 0.25;
  }

  return plane_averages;
}

function edge_diff_map(
  width: number,
  height: number,
  img1: ImageRgbPlanar,
  mu1: ImageRgbPlanar,
  img2: ImageRgbPlanar,
  mu2: ImageRgbPlanar
) {
  const one_per_pixels = 1.0 / (width * height);
  const plane_averages = new Array(12).fill(0);

  // TODO 确认此段逻辑是否一致
  for (let c = 0; c < 3; c++) {
    const sum1 = [0, 0, 0, 0];
    for (const [row1, [row2, [rowm1, rowm2]]] of zip(
      // @ts-ignore
      img1[c].chunks_exact(width),
      // @ts-ignore
      img2[c]
        // @ts-ignore
        .chunks_exact(width)
        // @ts-ignore
        .zip(mu1[c].chunks_exact(width).zip(mu2[c].chunks_exact(width)))
    )) {
      for (let x = 0; x < width; x++) {
        const d1 =
          (1.0 + Math.abs(row2[x] - rowm2[x])) /
            (1.0 + Math.abs(row1[x] - rowm1[x])) -
          1.0;
        const artifact = Math.max(0, d1);
        sum1[0] += artifact;
        sum1[1] += artifact ** 4;
        const detail_lost = Math.max(0, -d1);
        sum1[2] += detail_lost;
        sum1[3] += detail_lost ** 4;
      }
    }
    // TODO 值偏差较大
    plane_averages[c * 4] = one_per_pixels * sum1[0];
    plane_averages[c * 4 + 1] = (one_per_pixels * sum1[1]) ** 0.25;
    plane_averages[c * 4 + 2] = one_per_pixels * sum1[2];
    plane_averages[c * 4 + 3] = (one_per_pixels * sum1[3]) ** 0.25;
  }
  return plane_averages;
}

export { compute_frame_ssimulacra2 };
