// import * as calcS2Rust from "calc-s2-rust";
import { compute_by_wasm } from "../src/wasm";

describe("wasm test", () => {
  it("load wasm ok", async () => {
    const result = await compute_by_wasm(
      "examples/icon_90q.jpg",
      "examples/icon_30q.jpg"
    );
    console.log("result", result);
  });
});
