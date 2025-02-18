const path = require("path");

module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "static"),
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"], // Add TypeScript extensions
    alias: {
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
  },
  watchOptions: {
    ignored: '**/node_modules',
  },
  module: {
    rules: [
      { test: /\.css$/, 
        // include: [path.resolve(__dirname, "src")],
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(js|ts|tsx)$/, // Process JS, TS, and TSX files
        include: [
          path.resolve(__dirname, "src"),
          path.resolve(__dirname, "src/Components/Chatbot/frontend/hprc-chatbot-gui")
        ],
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-react", "@babel/preset-env", "@babel/preset-typescript"],
          },
        },
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
      },
    ],
  },
};
