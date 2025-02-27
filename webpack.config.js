const path = require("path");
module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "static"),
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
    alias: {
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      '@config': path.resolve(__dirname, 'config.yml'),
      '@composer_index': path.resolve(__dirname, 'src/composer', 'ComposerWrapper.js')
    },
  },
  watchOptions: {
    ignored: '**/node_modules',
  },
  module: {
    rules: [
      { 
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(js|ts|tsx)$/,
        include: [
          path.resolve(__dirname, "src"),
          path.resolve(__dirname, "src/Components/Chatbot/frontend/hprc-chatbot-gui"),
          path.resolve(__dirname, "external/drona_composer/src")
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
              outputPath: 'images/',
            },
          },
        ],
      },
    ],
  },
};
