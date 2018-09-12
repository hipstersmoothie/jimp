import tinyColor from 'tinycolor2';
import { scan, throwError, isNodePattern } from '@jimp/utils';

function cssColorToHex(cssColor) {
  cssColor = cssColor || 0; // 0, null, undefined, NaN

  if (typeof cssColor === 'number') return Number(cssColor);

  return parseInt(tinyColor(cssColor).toHex8(), 16);
}

function intToRGBA(i, cb) {
  if (typeof i !== 'number') {
    return throwError.call(this, 'i must be a number', cb);
  }

  const rgba = {};

  rgba.r = Math.floor(i / Math.pow(256, 3));
  rgba.g = Math.floor((i - rgba.r * Math.pow(256, 3)) / Math.pow(256, 2));
  rgba.b = Math.floor(
    (i - rgba.r * Math.pow(256, 3) - rgba.g * Math.pow(256, 2)) /
      Math.pow(256, 1)
  );
  rgba.a = Math.floor(
    (i -
      rgba.r * Math.pow(256, 3) -
      rgba.g * Math.pow(256, 2) -
      rgba.b * Math.pow(256, 1)) /
      Math.pow(256, 0)
  );

  if (isNodePattern(cb)) {
    cb.call(this, null, rgba);
  }

  return rgba;
}

function parseColor(color) {
  if (typeof color === 'number') {
    color = intToRGBA(color);
  }

  if (typeof color === 'string') {
    const { _r, _g, _b } = tinyColor(color);
    color = { r: _r, g: _g, b: _b };
  }

  return color;
}

function createGradient(resolve, reject, { height, width, gradient }) {
  this.bitmap = {
    data: Buffer.alloc(height * width * 4),
    width,
    height
  };

  const { colors = [], angle = 0, modifier = 0 } = gradient;

  const color1 = parseColor(colors[0]);
  const color2 = parseColor(colors[1]);

  const x = Math.cos((angle / 180) * Math.PI);
  const y = Math.sin((angle / 180) * Math.PI);

  for (let column = 0; column < this.bitmap.width; column++) {
    for (let row = 0; row < this.bitmap.height; row++) {
      const index = (this.bitmap.width * row + column) << 2;
      const yAdj =
        y < 0
          ? ((this.bitmap.height - row) / this.bitmap.height) * -y
          : (row / this.bitmap.height) * y;
      const xAdj =
        x < 0
          ? ((this.bitmap.width - column) / this.bitmap.width) * -x
          : (column / this.bitmap.width) * x;
      const a = yAdj + xAdj;

      this.bitmap.data[index + 0] =
        this.constructor.limit255((1 - a + modifier) * color1.r) +
        this.constructor.limit255((0 + a - modifier) * color2.r);
      this.bitmap.data[index + 1] =
        this.constructor.limit255((1 - a + modifier) * color1.g) +
        this.constructor.limit255((0 + a - modifier) * color2.g);
      this.bitmap.data[index + 2] =
        this.constructor.limit255((1 - a + modifier) * color1.b) +
        this.constructor.limit255((0 + a - modifier) * color2.b);
      this.bitmap.data[index + 3] = 0xff;
    }
  }

  resolve();
}

export default [
  'Gradient',
  ({ background }) => background === 'gradient',
  createGradient
];
