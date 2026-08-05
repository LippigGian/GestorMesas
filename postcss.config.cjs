// module.exports = {
//   plugins: {
//     tailwindcss: {},
//     autoprefixer: {},
//     "@tailwindcss/postcss": {},
//   },
// };

const tailwindcss = require('@tailwindcss/postcss');

module.exports = {
  plugins: [
    tailwindcss(),
    require('autoprefixer'),
  ],
};
