const path = require("path");

module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "static"),
  },
  module: {
    rules: [
      { test: /\.css$/, 
        // include: [path.resolve(__dirname, "src")],
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.js$/,
        include: [path.resolve(__dirname, "src")],
        use: ["babel-loader"],
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
