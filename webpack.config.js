var path = require('path');
var webpack = require('webpack');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var CleanWebpackPlugin = require('clean-webpack-plugin');
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var extractCssPlugin = new ExtractTextPlugin({
    filename: 'Cesium.css'
});

var configs = {
    context: __dirname,
    entry: ["./Source/Cesium.js"],
    output: {
        // path: path.resolve(__dirname,"Apps/WebpackDemo"),
        filename: "Cesium.js",
        library: "Cesium",
        sourcePrefix: '',
    },

    // Enable sourcemaps for debugging webpack's output.
    devtool: "eval",

    module:  {
        unknownContextCritical: false,
        unknownContextRegExp: /^.\/.*$/,
        rules : [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: ['es2015'],

                        }
                    }
                ]
            },
            {
                test: /\.glsl$/,
                use: { loader: 'webpack-glsl-loader' }
            },
            {
                test: /\.scss$/,
                use: extractCssPlugin.extract({
                    publicPath: './',
                    use: ['css-loader','sass-loader']
                })
            },
            {
                test: /\.css$/,use: { loader: 'css-loader'}
            },
            {
                test: /\.woff$/,use: { loader: 'url-loader?limit=10000&mimetype=application/font-woff'}
            },
            {
                test: /\.(ttf|eot|svg)$/,use: { loader: 'file-loader?name=[name].[ext]'}
            },
            {
              test: /\.(jpeg|png|gif)$/,
              use: [
                'url-loader?limit=10000',
                'img-loader'
              ]
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin([path.join(__dirname, 'Apps/WebpackDemo/lib')]),
        new webpack.HotModuleReplacementPlugin(),
        extractCssPlugin,
        new CopyWebpackPlugin([{
          from: "Source/Widgets",
          to: "Widgets",
          ignore: ['*.js'],
        }]),
        new CopyWebpackPlugin([{
            from: "Source/Assets",
            to: "Assets",
            ignore: ['*.js'],
          }]),
        new CopyWebpackPlugin([{
            from: "Source/Workers",
            to: 'Workers'
        }])
    ]
};

module.exports = configs;
