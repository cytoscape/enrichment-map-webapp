const path = require('path');
const DotEnvPlugin = require('dotenv-webpack');
const { env } = require('process');
const nodeEnv = env.NODE_ENV || 'development';
const isProd = env.NODE_ENV === 'production';
const minify = env.MINIFY == 'true' || isProd;

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

  module: {
    rules: [
      {
        test: /\.js|\.jsx$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        resolve: { fullySpecified: false, }
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },

  resolve: {
    extensions: ['', '.js', '.jsx', '.css'],
    modules: ['node_modules']
  },

  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendors: {
          name: 'deps',
          // test: (mod, chunks) => {
          //   let context = mod.context || '';

          //   return context.indexOf('node_modules') >= 0 && !chunks.some(chunk => chunk.name === 'polyfills');
          // }
          test: /[\\/]node_modules[\\/]|vendor[\\/]/,
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

  plugins: [
    new DotEnvPlugin({ defaults: true })
  ],

};

module.exports = conf;
