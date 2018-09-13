import tinyColor from 'tinycolor2';
import { scan, throwError, isNodePattern, limit255 } from '@jimp/utils';

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

function createGradient(width, height, gradient) {
  const bitmap = Buffer.alloc(height * width * 4);
  const { colors = [], angle = 0, modifier = 0 } = gradient;

  const color1 = parseColor(colors[0]);
  const color2 = parseColor(colors[1]);

  const x = Math.cos((angle / 180) * Math.PI);
  const y = Math.sin((angle / 180) * Math.PI);

  for (let column = 0; column < width; column++) {
    for (let row = 0; row < height; row++) {
      const index = (width * row + column) << 2;
      const yAdj = y < 0 ? ((height - row) / height) * -y : (row / height) * y;
      const xAdj =
        x < 0 ? ((width - column) / width) * -x : (column / width) * x;
      const a = yAdj + xAdj;

      bitmap[index + 0] =
        limit255((1 - a + modifier) * color1.r) +
        limit255((0 + a - modifier) * color2.r);
      bitmap[index + 1] =
        limit255((1 - a + modifier) * color1.g) +
        limit255((0 + a - modifier) * color2.g);
      bitmap[index + 2] =
        limit255((1 - a + modifier) * color1.b) +
        limit255((0 + a - modifier) * color2.b);
      bitmap[index + 3] = 0xff;
    }
  }

  return bitmap;
}

function gradientConstructor(resolve, reject, { height, width, gradient }) {
  gradient = Object.assign({ colors: [], angle: 0, modifier: 0 }, gradient);

  const { colors = [] } = gradient;
  const gradients = colors.length - 2;

  // for (let i = 0; i <= gradients; i++) {
  const data = createGradient(width, height, {
    ...gradient,
    colors: [colors[0], colors[0 + 1]]
  });
  // }

  this.bitmap = {
    data,
    width,
    height
  };

  resolve();
}

export default [
  'Gradient',
  ({ background }) => background === 'gradient',
  gradientConstructor
];
