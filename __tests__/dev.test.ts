import { readImage } from "../src/readImage";

describe("dev test", () => {
  it("read file", async () => {
    const { data, info } = await readImage("examples/icon_90q.jpg");
    expect(data.length).toBeGreaterThan(0);
    expect(info.width).toBe(512);
  });
});
