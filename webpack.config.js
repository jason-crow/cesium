
var HtmlWebpackPlugin = require('html-webpack-plugin');

var config = {
    entry: "./Source/Cesium.js",
        devtool: "eval",
        output: {
            path: __dirname + '/public',
            filename: "Cesium.js",
            library: "Cesium",
            sourcePrefix: ''
        },
        externals: {
            'fs':true
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: 'index.html',
                inject : true
            })
        ],
        devServer: {
            contentBase: './public',
        },
        module: {
            unknownContextCritical: false,
            unknownContextRegExp: /^.\/.*$/,
            loaders: [
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
                test: /\.css$/,use: { loader: 'css-loader'}
                },
                {
                    test: /\.(png|gif|jpg|jpeg)$/,
                    use: { loader: 'file-loader'}
                }
            ]
        }
};
module.exports = config;
