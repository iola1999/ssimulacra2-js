export class MsssimScale {
  avg_ssim: number[]; // size: 3*2
  avg_edgediff: number[]; // size: 3*4

  constructor(avg_ssim: number[], avg_edgediff: number[]) {
    this.avg_ssim = avg_ssim;
    this.avg_edgediff = avg_edgediff;
  }
}

export class Msssim {
  scales: MsssimScale[] = [];

  constructor() {}

  score() {
    const WEIGHT = [
      0.0, 0.0, 0.0, 1.003_547_935_251_235_3, 0.000_113_220_611_104_747_35,
      0.000_404_429_918_236_859_36, 0.001_895_383_410_578_377_3, 0.0, 0.0,
      8.982_542_997_575_905, 0.989_978_579_604_555_6, 0.0,
      0.974_831_513_120_794_2, 0.958_157_516_993_797_3, 0.0,
      0.513_361_177_795_294_6, 1.042_318_931_733_124_3,
      0.000_308_010_928_520_841, 12.149_584_966_240_063,
      0.956_557_724_811_546_7, 0.0, 1.040_666_812_313_682_4,
      81.511_390_460_573_62, 0.305_933_918_953_309_46, 1.075_221_443_362_677_9,
      1.103_904_236_946_461_1, 0.0, 1.021_911_638_819_618,
      1.114_182_329_685_572_2, 0.973_084_575_144_170_5, 0.0, 0.0, 0.0,
      0.983_391_842_609_550_5, 0.792_038_513_705_986_7, 0.971_074_041_151_405_3,
      0.0, 0.0, 0.0, 0.538_707_790_315_263_8, 0.0, 3.403_694_560_115_580_4, 0.0,
      0.0, 0.0, 2.337_569_295_661_117, 0.0, 5.707_946_510_901_609,
      37.830_864_238_781_57, 0.0, 0.0, 3.825_820_059_430_518_5, 0.0, 0.0,
      24.073_659_674_271_497, 0.0, 0.0, 13.181_871_265_286_068, 0.0, 0.0, 0.0,
      0.0, 0.0, 10.007_501_212_628_95, 0.0, 0.0, 0.0, 0.0, 0.0,
      52.514_283_856_038_91, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
      0.0, 0.0, 0.0, 0.0, 0.0, 0.994_646_426_789_441_7, 0.0, 0.0,
      0.000_604_044_771_593_481_6, 0.0, 0.0, 0.994_517_149_137_407_2, 0.0,
      2.826_004_380_945_437_6, 1.005_264_276_653_451_6,
      8.201_441_997_546_244e-5, 12.154_041_855_876_695, 32.292_928_706_201_266,
      0.992_837_130_387_521, 0.0, 30.719_255_178_446_03,
      0.000_123_099_070_222_787_43, 0.0, 0.982_626_023_705_173_4, 0.0, 0.0,
      0.998_092_836_783_765_1, 0.012_142_430_067_163_312,
    ];

    let ssim = 0.0;

    let i = 0;
    for (let c = 0; c < 3; c++) {
      for (let scale of this.scales) {
        for (let n = 0; n < 2; n++) {
          ssim += WEIGHT[i] * Math.abs(scale.avg_ssim[c * 2 + n]);
          i += 1;
          ssim += WEIGHT[i] * Math.abs(scale.avg_edgediff[c * 4 + n]);
          i += 1;
          ssim += WEIGHT[i] * Math.abs(scale.avg_edgediff[c * 4 + n + 2]);
          i += 1;
        }
      }
    }

    // TODO 值偏差较大，测试图此处上方应该约 0.4109，下面 if 之前约 5.6926
    ssim = ssim * 17.829_717_797_575_952 - 1.634_169_143_917_183;
    if (ssim > 0.0) {
      ssim = Math.pow(ssim, 0.545_326_100_951_021_3) * -10 + 100;
    } else {
      ssim = 100.0;
    }
    return ssim;
  }
}
