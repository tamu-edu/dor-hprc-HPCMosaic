const path = require("path");

module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "static"),
  },
  watchOptions: {
    ignored: '**/node_modules',
  },
  resolve: {
    alias: {
      '@config': path.resolve(__dirname, 'config.yml'),
      '@composer_index': path.resolve(__dirname, 'src/composer', 'ComposerWrapper.js')
    }
  },
  module: {
    rules: [
      { test: /\.css$/, 
        // include: [path.resolve(__dirname, "src")],
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.js$/,
        include: [path.resolve(__dirname, "src"),
		  path.resolve(__dirname, "external/drona_composer/src")],
        use: ["babel-loader"],
      },
      {
        test: /\.ya?ml$/,
        use: 'yaml-loader'
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'images/', // Optional: Specify a custom output directory
            },
          },
        ],
      }
    ],
  },
};
