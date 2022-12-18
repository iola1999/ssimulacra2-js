import init, { calc_s2, InitOutput, new_buffer } from "calc-s2-rust";
import fs from "fs";
import path from "path";
import { readImage } from "./util";

async function setImageBuffer(imagePath: string, wasmModule: InitOutput) {
  const imageInfo = await readImage(imagePath);
  const { info, data } = imageInfo;
  const { width, height, channels } = info;
  const memLength = width * height * 3;
  // or, use file hash as key
  const bufferPtr = new_buffer(imagePath, memLength);
  // zero copy
  const wasmU8ca = new Uint8ClampedArray(
    wasmModule.memory.buffer,
    bufferPtr,
    memLength
  );
  for (let i = 0; i < data.length; i += channels) {
    const index = i / channels;
    wasmU8ca[index] = data[i];
    wasmU8ca[index + 1] = data[i + 1];
    wasmU8ca[index + 2] = data[i + 2];
  }

  return imageInfo.info;
}

async function compute_by_wasm(sourceImgPath1: string, sourceImgPath2: string) {
  const wasmBuffer = fs.readFileSync(
    // ??? FIXME
    path.resolve("node_modules/calc-s2-rust/calc_s2_rust_bg.wasm")
  );
  const wasmModule = await init(wasmBuffer);

  const imageInfo1 = await setImageBuffer(sourceImgPath1, wasmModule);
  await setImageBuffer(sourceImgPath2, wasmModule);
  const result = calc_s2(
    sourceImgPath1,
    sourceImgPath2,
    imageInfo1.width,
    imageInfo1.height
  );
  return result;
}

export { compute_by_wasm };
