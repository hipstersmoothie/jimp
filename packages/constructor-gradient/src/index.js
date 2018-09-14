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

  const angleInRadians = (angle / 180) * Math.PI;
  const x = Math.cos(angleInRadians);
  const y = Math.sin(angleInRadians);

  // 1 period for every color transition
  const periodLength = (colors.length - 1) * Math.PI;
  console.log('PERIOD LENGTH', periodLength);
  let line = height;

  if (y !== 0 && x !== 0) {
    // Line to calculate wave across - hypotonous
    line = width / Math.cos(angleInRadians);
  }

  if (y === 1) {
    line = width;
  }

  const periodWidth = line / (colors.length - 1);

  console.log('WIDTH', line);
  console.log('PERIOD WIDTH', periodWidth);

  // Calculate a cosine wave to blend between two colors
  // Math.abs for 90 degree hack
  function project(v1, v2) {
    const dot =
      (v1[0] * v2[0] + v1[1] * v2[1]) / (v2[0] * v2[0] + v2[1] * v2[1]);

    return [v2[0] * dot, v2[1] * dot];
  }

  function progress([x, y]) {
    return Math.sqrt(x * x + y * y);
  }

  function calculateWave(c, r, w = width) {
    const pointOnLine = project([r, c], [x, y]);
    const progressOfWave = progress(pointOnLine);

    return {
      progress: progressOfWave,
      wave: Math.cos((periodLength * progressOfWave) / w)
    };
  }

  function determineSegment(progress) {
    let seg = 0;

    while (progress > periodWidth * (seg + 1)) {
      seg++;
    }

    return seg;
  }

  console.log(x, y);

  for (let column = 0; column < width; column++) {
    for (let row = 0; row < height; row++) {
      const index = (width * row + column) << 2;

      const { wave, progress } = calculateWave(column, row, line);

      // This gets color to fade on a scale of 0-1
      const a = (wave + 1) / 2;
      const color1Adjustment = a + modifier;
      const color2Adjustment = 1 - a - modifier;

      const seg = determineSegment(progress);
      const color1 = seg % 2 === 0 ? colors[seg] : colors[seg + 1];
      const color2 = seg % 2 === 0 ? colors[seg + 1] : colors[seg];
      console.log({
        column,
        row,
        segment: determineSegment(progress),
        progress,
        halfPeriod: periodLength / 2
      });

      bitmap[index + 0] =
        limit255(color1Adjustment * color1.r) +
        limit255(color2Adjustment * color2.r);
      bitmap[index + 1] =
        limit255(color1Adjustment * color1.g) +
        limit255(color2Adjustment * color2.g);
      bitmap[index + 2] =
        limit255(color1Adjustment * color1.b) +
        limit255(color2Adjustment * color2.b);
      bitmap[index + 3] = 0xff;
    }
  }

  // Shortcut to on rotate 0-90 and flip the image for the rest
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
