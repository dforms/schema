module.exports = {
    entry: './src/dforms.ts',
    output: {
        filename: 'dforms.js',
        libraryTarget: "var",
        library: "DForms"
    },
    externals: {
        "jquery": "jQuery"
    },
    resolve: {
        extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.js']
    },
    module: {
        loaders: [
            {test: /\.tsx?$/, loader: 'ts-loader'}
        ]
    },
    devtool: 'inline-source-map'
}
