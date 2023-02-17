# ssimulacra2-js

> Update: It is recommended to use [@nrs-binding/ssimulacra2](https://github.com/plwljobue77256/nrs-binding-ssimulacra2) in Node.js environment.

<details>
<summary>Pure JS</summary>

使用 js 实现 [ssimulacra2](https://github.com/cloudinary/ssimulacra2) 计算。

包含两种实现:

- src/index: 手动翻译 [https://github.com/rust-av/ssimulacra2](https://github.com/rust-av/ssimulacra2) Rust 代码为 Javascript 实现

- src/wasm: 调用 [https://github.com/iola1999/calc-s2-rust](https://github.com/iola1999/calc-s2-rust) 的 Wasm 实现

其中纯 js 实现的目前还有精度问题（结果不正确），性能相较 Wasm 也较差。Wasm 方案是正常可用的。

</details>
