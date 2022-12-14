import { readImage } from "../src/util";

describe("dev test", () => {
  it("read file ok", async () => {
    const { data, info } = await readImage("examples/icon_90q.jpg");
    expect(info.width).toBe(512);
    expect(data.length).toBe(info.width * info.height * info.channels);
  });

  it("read file image with alpha channel ok", async () => {
    const { data, info } = await readImage("examples/with-alpha-compressed.webp");
    expect(info.width).toBe(550);
    expect(data.length).toBe(info.width * info.height * info.channels);
  });
});
