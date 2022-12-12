import { compute_frame_ssimulacra2 } from "../src";

describe("main test", () => {
  it("compare ok", async () => {
    const result = await compute_frame_ssimulacra2(
      "examples/icon_90q.jpg",
      "examples/icon_30q.jpg"
    );
    console.log("result", result);
  });

  it("compare image with alpha ok", async () => {
    const result = await compute_frame_ssimulacra2(
      "examples/with-alpha-original.webp",
      "examples/with-alpha-compressed.webp"
    );
    console.log("result", result);
  });
});
