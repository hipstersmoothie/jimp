import tinyColor from 'tinycolor2';
import { throwError, isNodePattern, limit255 } from '@jimp/utils';

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

function hypotenuse([x, y]) {
  return Math.sqrt(x * x + y * y);
}

function project(v1, v2) {
  const dot = (v1[0] * v2[0] + v1[1] * v2[1]) / (v2[0] * v2[0] + v2[1] * v2[1]);

  return [v2[0] * dot, v2[1] * dot];
}

function determineSegment(progress, periodWidth, maxColors) {
  let seg = 0;

  while (progress > periodWidth * (seg + 1)) {
    seg++;
  }

  if (seg >= maxColors) {
    seg--;
  }

  return seg;
}

function toRadians(angle) {
  return (angle / 180) * Math.PI;
}

function truncateFloat(float) {
  return parseFloat(float.toFixed(15), 10);
}

function createGradient(width, height, gradient) {
  const bitmap = Buffer.alloc(height * width * 4);
  let { colors = [], angle = 0, modifier = 0 } = gradient;

  colors = colors.map(parseColor);

  const quarters = angle / 90;

  if (angle > 90) {
    console.log({ quarters, newAngle: angle - 90 * quarters });
    angle = angle - 90 * Math.floor(quarters);
    console.log({ angle });
  }

  const angleInRadians = toRadians(angle);
  const x = truncateFloat(Math.cos(angleInRadians));
  const y = truncateFloat(Math.sin(angleInRadians));

  // 1 period for every color transition
  const periodLength = (colors.length - 1) * Math.PI;
  // For 0/180 just use height and for 90/280 just use width
  let line = Math.abs(x) === 1 ? width : height;

  // console.log({ angle, angleInRadians });
  // We have and angle that !== 0, 90, 180, 270
  if (y !== 0 && x !== 0) {
    // Determine the length of the wave
    line = Math.abs(width / Math.cos(angleInRadians));

    // Triangle would go outside of circle
    if (line > height || line > width) {
      const hype = hypotenuse([width, height]);

      if (line >= hype) {
        const hypeAngle = Math.asin(height / hype);
        line = Math.cos(angleInRadians - hypeAngle) * hype;
      } else {
        line = hype;
      }
    }
  }

  // console.log('LINE', line);
  // Each period represent 2 colors blending, so we will have colors.length - 1 overall
  const periodWidth = line / (colors.length - 1);
  // console.log(periodWidth);

  function calculateWave(c, r, w = width) {
    // Math.abs for 90 degree hack
    // Project point onto gradient line
    const pointOnLine = project([r, c], [Math.abs(x), Math.abs(y)]);
    // Get Distance to that point. this will represent the percentage of the line we have gone through
    const progressOfWave = hypotenuse(pointOnLine);

    return {
      progress: progressOfWave,
      // Calculate a cosine wave to blend between two colors
      wave: Math.cos((periodLength * progressOfWave) / w)
    };
  }

  for (let row = 0; row < width; row++) {
    for (let column = 0; column < height; column++) {
      const index = (width * column + row) << 2;
      const { wave, progress } = calculateWave(column, row, line);

      // Put A on a scale of 0 to 1 rather than -1 to 1
      const a = (wave + 1) / 2;
      // This gets color to fade on a scale of 0 to 1
      const color1Adjustment = a + modifier;
      // Do the opposite for the other color. color1Adjustment + color2Adjustment = a
      const color2Adjustment = 1 - a - modifier;

      // Determine the color base on progress through line
      const seg = determineSegment(progress, periodWidth, colors.length - 1);
      // Have to flip between colors for some reason?
      const color1 =
        (seg % 2 === 0 ? colors[seg] : colors[seg + 1]) || colors[seg];
      const color2 =
        (seg % 2 === 0 ? colors[seg + 1] : colors[seg]) || colors[seg];
      // console.log(wave);

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
  const xDirection = truncateFloat(Math.cos(toRadians(gradient.angle)));
  const yDirection = truncateFloat(Math.sin(toRadians(gradient.angle)));

  console.log({ xDirection, yDirection });
  // for (let column = 0; column < width; column++) {
  //   for (let row = 0; row < height; row++) {
  //     const index = (width * row + column) << 2;

  //     const _x = xDirection < 0 ? width - 1 - column : column;
  //     const _y = yDirection < 0 ? height - 1 - row : row;
  //     const _idx = (width * _y + _x) << 2;
  //     const data = bitmap.readUInt32BE(index);

  //     finalBitmap.writeUInt32BE(data, _idx);
  //   }
  // }

  return bitmap;
}

function gradientConstructor(resolve, reject, { height, width, gradient }) {
  // Set defaults
  gradient = Object.assign({ colors: [], angle: 0, modifier: 0 }, gradient);

  this.bitmap = {
    data: createGradient(width, height, gradient),
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
