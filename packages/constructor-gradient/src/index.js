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
  let { colors = [], angle = 0, modifier = 0 } = gradient;

  colors = colors.map(parseColor);

  const x = Math.cos((angle / 180) * Math.PI);
  const y = Math.sin((angle / 180) * Math.PI);

  console.log('here', x, y, angle);

  console.log('height', height);
  console.log('width', width);
  const waves = 10 * (colors.length - 1);
  const xMax = parseInt((width * x).toFixed(10)) || 1;
  const yMax = parseInt((height * y).toFixed(10)) || 1;
  const max = xMax * yMax;

  const segments = 1 / (colors.length - 1);
  console.log(yMax, xMax, max, segments);
  let currentSegment = 0;
  let color1 = colors[currentSegment];
  let color2 = colors[currentSegment + 1];
  let oddSegment = true;

  console.log(colors);
  console.log(color1, color2);

  for (let column = 0; column < width; column++) {
    for (let row = 0; row < height; row++) {
      const progress = (row * y * column * x) / max;

      // console.log(progress);
      if (progress > (currentSegment + 1) * segments) {
        currentSegment++;
        color1 =
          oddSegment && colors[currentSegment + 1]
            ? colors[currentSegment + 1]
            : colors[currentSegment];
        color2 = oddSegment
          ? colors[currentSegment]
          : colors[currentSegment + 1];
        console.log(color1, color2);
        oddSegment = !oddSegment;
      }

      const index = (width * row + column) << 2;

      const wave = Math.cos(
        (waves / (width * Math.abs(x) + height * Math.abs(y)) / Math.PI) *
          (column * Math.abs(x) + row * Math.abs(y))
      );
      const a = 1 - (wave + 1) / 2;
      const color1Adjustment = 1 - a;
      const color2Adjustment = a;

      bitmap[index + 0] =
        limit255((color1Adjustment + modifier) * color1.r) +
        limit255((color2Adjustment - modifier) * color2.r);
      bitmap[index + 1] =
        limit255((color1Adjustment + modifier) * color1.g) +
        limit255((color2Adjustment - modifier) * color2.g);
      bitmap[index + 2] =
        limit255((color1Adjustment + modifier) * color1.b) +
        limit255((color2Adjustment - modifier) * color2.b);
      bitmap[index + 3] = 0xff;
    }
  }

  const finalBitmap = Buffer.alloc(bitmap.length);

  for (let column = 0; column < width; column++) {
    for (let row = 0; row < height; row++) {
      const index = (width * row + column) << 2;

      const _x = x < 0 ? width - 1 - column : column;
      const _y = y < 0 ? height - 1 - row : row;
      const _idx = (width * _y + _x) << 2;
      const data = bitmap.readUInt32BE(index);

      finalBitmap.writeUInt32BE(data, _idx);
    }
  }

  return finalBitmap;
}

function gradientConstructor(resolve, reject, { height, width, gradient }) {
  gradient = Object.assign({ colors: [], angle: 0, modifier: 0 }, gradient);

  const { colors = [] } = gradient;

  const data = createGradient(width, height, {
    ...gradient
  });

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
