import { Aligned } from "./Aligned";
import { Matrix3 } from "three";
import { ImageRgbPlanar } from "./type";

export class RecursiveGaussian {
  radius: number;
  /// For k={1,3,5} in that order.
  vert_mul_in: [number, number, number];
  vert_mul_prev: [number, number, number];
  /// We unroll horizontal passes 4x - one output per lane. These are each
  /// lane's multiplier for the previous output (relative to the first of
  /// the four outputs). Indexing: 4 * 0..2 (for {1,3,5}) + 0..3 for the
  /// lane index.
  mul_prev: Aligned;
  /// Ditto for the second to last output.
  mul_prev2: Aligned;
  /// We multiply a vector of inputs 0..3 by a vector shifted from this array.
  /// in=0 uses all 4 (nonzero) terms; for in=3, the lower three lanes are 0.
  mul_in: Aligned;

  constructor() {
    const SIGMA = 1.5;

    // (57), "N"
    let radius = Math.round(3.2795 * SIGMA + 0.2546);

    // Table I, first row
    let pi_div_2r = Math.PI / (2.0 * radius);
    let omega = [pi_div_2r, 3.0 * pi_div_2r, 5.0 * pi_div_2r];

    // (37), k={1,3,5}
    let p_1 = 1.0 / Math.tan(0.5 * omega[0]);
    let p_3 = -1.0 / Math.tan(0.5 * omega[1]);
    let p_5 = 1.0 / Math.tan(0.5 * omega[2]);

    // (44), k={1,3,5}
    let r_1 = (p_1 * p_1) / Math.sin(omega[0]);
    let r_3 = (-p_3 * p_3) / Math.sin(omega[1]);
    let r_5 = (p_5 * p_5) / Math.sin(omega[2]);

    // (50), k={1,3,5}
    let neg_half_sigma2 = -0.5 * SIGMA * SIGMA;
    let recip_radius = 1.0 / radius;
    let rho = [0.0, 0.0, 0.0];
    for (let i = 0; i < 3; i++) {
      rho[i] = Math.exp(neg_half_sigma2 * omega[i] * omega[i]) * recip_radius;
    }

    // second part of (52), k1,k2 = 1,3; 3,5; 5,1
    let d_13 = p_1 * r_3 - r_1 * p_3;
    let d_35 = p_3 * r_5 - r_3 * p_5;
    let d_51 = p_5 * r_1 - r_5 * p_1;

    // (52), k=5
    let recip_d13 = 1.0 / d_13;
    let zeta_15 = d_35 * recip_d13;
    let zeta_35 = d_51 * recip_d13;

    // (56)
    const aMatrix3 = new Matrix3();
    // TODO 确认效果一致？
    let a = aMatrix3
      .set(p_1, p_3, p_5, r_1, r_3, r_5, zeta_15, zeta_35, 1.0)
      .invert();

    // (55)
    const gammaMatrix3 = new Matrix3();
    // TODO 确认效果一致？
    let gamma = gammaMatrix3.set(
      1.0,
      radius * radius - SIGMA * SIGMA,
      zeta_15 * rho[0] + zeta_35 * rho[1] + rho[2],
      0,
      0,
      0,
      0,
      0,
      0
    );

    // (53)
    let beta = a.multiply(gamma);

    // Sanity check: correctly solved for beta (IIR filter weights are normalized)
    // (39)
    let sum =
      beta.elements[2] * p_5 + beta.elements[0] * p_1 + beta.elements[1] * p_3;

    if (Math.abs(sum - 1.0) >= 1e-12) throw new Error("shoule < 1e-12");

    let n2: [number, number, number] = [0.0, 0.0, 0.0];
    let d1: [number, number, number] = [0.0, 0.0, 0.0];
    let mul_prev = new Array(12).fill(0.0);
    let mul_prev2 = new Array(12).fill(0.0);
    let mul_in = new Array(12).fill(0.0);
    for (let i = 0; i < 3; i++) {
      // (33)
      n2[i] = -beta.elements[i] * Math.cos(omega[i] * (radius + 1.0));
      d1[i] = -2.0 * Math.cos(omega[i]);

      let d_2 = d1[i] * d1[i];

      // Obtained by expanding (35) for four consecutive outputs via
      // sympy: n, d, p, pp = symbols('n d p pp')
      // i0, i1, i2, i3 = symbols('i0 i1 i2 i3')
      // o0, o1, o2, o3 = symbols('o0 o1 o2 o3')
      // o0 = n*i0 - d*p - pp
      // o1 = n*i1 - d*o0 - p
      // o2 = n*i2 - d*o1 - o0
      // o3 = n*i3 - d*o2 - o1
      // Then expand(o3) and gather terms for p(prev), pp(prev2) etc.
      mul_prev[4 * i] = -d1[i];
      mul_prev[4 * i + 1] = d_2 - 1.0;
      mul_prev[4 * i + 2] = d_2 * d1[i] - 2.0 * d1[i];
      mul_prev[4 * i + 3] = d_2 * d_2 - 3.0 * d_2 + 1.0;
      mul_prev2[4 * i] = -1.0;
      mul_prev2[4 * i + 1] = d1[i];
      mul_prev2[4 * i + 2] = d_2 - 1.0;
      mul_prev2[4 * i + 3] = d_2 * d1[i] - 2.0 * d1[i];
      mul_in[4 * i] = n2[i];
      mul_in[4 * i + 1] = d1[i] * n2[i];
      mul_in[4 * i + 2] = d_2 * n2[i] - n2[i];
      mul_in[4 * i + 3] = d_2 * d1[i] * n2[i] - 2.0 * d1[i] * n2[i];
    }

    this.radius = radius;
    this.vert_mul_in = n2;
    this.vert_mul_prev = d1;
    this.mul_prev = new Aligned(mul_prev.length, mul_prev);
    this.mul_prev2 = new Aligned(mul_prev2.length, mul_prev2);
    this.mul_in = new Aligned(mul_in.length, mul_in);
  }

  horizontal_pass(input: number[], output: number[], width: number) {
    if (input.length !== output.length) {
      throw new Error("input and output must have the same length");
    }

    for (let i = 0; i < input.length; i += width) {
      this.horizontal_row(
        input.slice(i, i + width),
        output.slice(i, i + width),
        width
      );
    }
  }
  horizontal_row(input: number[], output: number[], width: number) {
    let big_n = this.radius;
    let mul_in_1 = this.mul_in.value[0];
    let mul_in_3 = this.mul_in.value[4];
    let mul_in_5 = this.mul_in.value[8];
    let mul_prev_1 = this.mul_prev.value[0];
    let mul_prev_3 = this.mul_prev.value[4];
    let mul_prev_5 = this.mul_prev.value[8];
    let mul_prev2_1 = this.mul_prev2.value[0];
    let mul_prev2_3 = this.mul_prev2.value[4];
    let mul_prev2_5 = this.mul_prev2.value[8];
    let prev_1 = 0;
    let prev_3 = 0;
    let prev_5 = 0;
    let prev2_1 = 0;
    let prev2_3 = 0;
    let prev2_5 = 0;

    let n = -big_n + 1;
    while (n < width) {
      let left = n - big_n - 1;
      let right = n + big_n - 1;
      // SAFETY: `left` can never be bigger than `width`
      let left_val = left >= 0 ? input[left] : 0;
      // SAFETY: this branch ensures that `right` is not bigger than `width`
      let right_val = right < width ? input[right] : 0;
      let sum = left_val + right_val;

      let out_1 = sum * mul_in_1;
      let out_3 = sum * mul_in_3;
      let out_5 = sum * mul_in_5;

      out_1 += mul_prev2_1 * prev2_1;
      out_3 += mul_prev2_3 * prev2_3;
      out_5 += mul_prev2_5 * prev2_5;
      prev2_1 = prev_1;
      prev2_3 = prev_3;
      prev2_5 = prev_5;

      out_1 += mul_prev_1 * prev_1;
      out_3 += mul_prev_3 * prev_3;
      out_5 += mul_prev_5 * prev_5;
      prev_1 = out_1;
      prev_3 = out_3;
      prev_5 = out_5;

      if (n >= 0) {
        // SAFETY: We know that this chunk of output is of size `width`,
        // which `n` cannot be larger than.
        output[n] = out_1 + out_3 + out_5;
      }

      n += 1;
    }
  }

  vertical_pass_chunked(
    J: number,
    K: number,
    input: number[],
    output: number[],
    width: number,
    height: number
  ) {
    if (J <= K) throw new Error("should be J > K");
    if (K <= 0) throw new Error("should be K > 0");
    if (input.length !== output.length) {
      throw new Error("input and output must have the same length");
    }

    let x = 0;
    while (x + J <= width) {
      this.vertical_pass(J, input.slice(x), output.slice(x), width, height);
      x += J;
    }

    while (x + K <= width) {
      this.vertical_pass(K, input.slice(x), output.slice(x), width, height);
      x += K;
    }

    while (x < width) {
      this.vertical_pass(1, input.slice(x), output.slice(x), width, height);
      x += 1;
    }
  }

  // Apply 1D vertical scan on COLUMNS elements at a time
  vertical_pass(
    COLUMNS: number,
    input: number[],
    output: number[],
    width: number,
    height: number
  ) {
    if (input.length !== output.length) {
      throw new Error("input and output must have the same length");
    }

    let big_n = this.radius;

    let zeroes = new Array(COLUMNS).fill(0);
    let prev = new Array(3 * COLUMNS).fill(0);
    let prev2 = new Array(3 * COLUMNS).fill(0);
    let out = new Array(3 * COLUMNS).fill(0);

    let n = -big_n + 1;
    while (n < height) {
      const top = n - big_n - 1;
      const bottom = n + big_n - 1;
      // TODO 确认此处 ..COLUMNS 逻辑是否正确
      const top_row =
        // TODO 确认此处引用 zeroes 逻辑是否正确
        top >= 0 ? input.slice(top * width, top * width + COLUMNS) : zeroes;
      const bottom_row =
        bottom < height
          ? input.slice(bottom * width, bottom * width + COLUMNS)
          : zeroes;

      for (let i = 0; i < COLUMNS; i++) {
        const sum = top_row[i] + bottom_row[i];

        const i1 = i;
        const i3 = i1 + COLUMNS;
        const i5 = i3 + COLUMNS;

        const mp1 = this.vert_mul_prev[0];
        const mp3 = this.vert_mul_prev[1];
        const mp5 = this.vert_mul_prev[2];

        let out1 = prev[i1] * mp1 + prev2[i1];
        let out3 = prev[i3] * mp3 + prev2[i3];
        let out5 = prev[i5] * mp5 + prev2[i5];

        const mi1 = this.vert_mul_in[0];
        const mi3 = this.vert_mul_in[1];
        const mi5 = this.vert_mul_in[2];

        out1 = sum * mi1 - out1;
        out3 = sum * mi3 - out3;
        out5 = sum * mi5 - out5;

        out[i1] = out1;
        out[i3] = out3;
        out[i5] = out5;

        if (n >= 0) {
          output[n * width + i] = out1 + out3 + out5;
        }
      }

      prev2 = [...prev];
      prev = [...out];

      n++;
    }
  }
}

export class Blur {
  kernel: RecursiveGaussian;
  temp: number[];
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.kernel = new RecursiveGaussian();
    this.temp = new Array(width * height).fill(0);
    this.width = width;
    this.height = height;
  }

  shrink_to(width: number, height: number) {
    this.temp.length = width * height;
    this.width = width;
    this.height = height;
  }

  blur_plane(plane: number[]) {
    let out = new Array(this.width * this.height).fill(0);
    this.kernel.horizontal_pass(plane, this.temp, this.width);
    this.kernel.vertical_pass_chunked(
      128,
      32,
      this.temp,
      out,
      this.width,
      this.height
    );
    return out;
  }

  blur(img: ImageRgbPlanar) {
    return [
      this.blur_plane(img[0]),
      this.blur_plane(img[1]),
      this.blur_plane(img[2]),
    ] as ImageRgbPlanar;
  }
}
