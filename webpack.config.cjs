const path = require('path');
const DotEnvPlugin = require('dotenv-webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const { env } = require('process');
const nodeEnv = env.NODE_ENV || 'development';
const isProd = env.NODE_ENV === 'production';
const isProfile = env.PROFILE === 'true';
const minify = env.MINIFY == 'true' || isProd;

let plugins = [
  new DotEnvPlugin({ defaults: true })
];

if (isProfile) {
  plugins.unshift(new BundleAnalyzerPlugin());
}

let conf = {
  mode: nodeEnv,

  devtool: isProd ? false : 'inline-source-map',

  entry: {
    main: './src/client/index.js',
    polyfills: './src/client/polyfills.js'
  },

  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js'
  },

  resolve: {
    alias: {
      '@mui/styled-engine': '@mui/styled-engine-sc'
    },
  },

  module: {
    rules: [
      { test: /\.(js|jsx)$/, exclude: /node_modules/, loader: 'babel-loader' }
    ]
  },

  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendors: {
          name: 'deps',
          test: (mod, chunks) => {
            let context = mod.context || '';

            return context.indexOf('node_modules') >= 0 && !chunks.some(chunk => chunk.name === 'polyfills');
          }
        },
        default: {
          name: 'main',
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
          test: (mod) => {
            let context = mod.context || '';

            return context.indexOf('node_modules') < 0;
          }
        }
      }
    },
    usedExports: minify
  },

  plugins
};

module.exports = conf;
