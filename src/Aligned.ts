export class Aligned {
  value: any[];
  constructor(length: number, defaultValue?: any[]) {
    this.value = defaultValue ? [...defaultValue] : new Array(length);
  }
}
