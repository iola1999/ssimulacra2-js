import { readImage } from "../src/util";

describe("dev test", () => {
  it("read file ok", async () => {
    const { data, info } = await readImage("examples/icon_90q.jpg");
    console.log(data[0], data[1], data[2], data[3], data[4], data[5]);
    console.log(info);
    expect(info.width).toBe(512);
    expect(data.length).toBe(info.width * info.height * 3);
  });
});
