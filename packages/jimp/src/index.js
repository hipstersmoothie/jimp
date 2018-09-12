import configure from '@jimp/custom';

import types from '@jimp/types';
import plugins from '@jimp/plugins';
import gradient from '@jimp/constructor-gradient';

export default configure({
  constructors: [gradient],
  types: [types],
  plugins: [plugins]
});
