const path = require('path')

module.exports = {
  mode: 'production',
  target: 'node',
  node: { __filename: false }, // false, // counterintuitively, this turns off any messing with __dirname, __filename, etc
  entry: {
    index: './src/index.js',
    worker: './src/worker.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
  },
  externals: {
    './worker': 'commonjs2 ./worker',
  },
  // These are only to make the output easier to read
  optimization: { minimize: false, namedModules: true },
}
