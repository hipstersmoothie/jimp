import tinyColor from 'tinycolor2';

function cssColorToHex(cssColor) {
  cssColor = cssColor || 0; // 0, null, undefined, NaN

  if (typeof cssColor === 'number') return Number(cssColor);

  return parseInt(tinyColor(cssColor).toHex8(), 16);
}

function createGradient(resolve, reject, { height, width, gradient }) {
  // with a hex color
  if (typeof gradient === 'number') {
    this._background = gradient;
  }

  // with a css color
  if (typeof gradient === 'string') {
    this._background = cssColorToHex(gradient);
  }

  this.bitmap = {
    data: Buffer.alloc(height * width * 4),
    width,
    height
  };

  for (let i = 0; i < this.bitmap.data.length; i += 4) {
    this.bitmap.data.writeUInt32BE(this._background, i);
  }

  resolve();
}

export default [
  'Gradient',
  ({ background }) => background === 'gradient',
  createGradient
];
