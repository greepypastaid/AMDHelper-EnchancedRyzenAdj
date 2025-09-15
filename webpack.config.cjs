const path = require('path');
const Dotenv = require('dotenv-webpack');

module.exports =  {
    target: "node",
    entry: "./index.ts",
    mode: "production",
    plugins: [
        new Dotenv(),
    ],
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'build'),
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx|tsx|ts)$/,
                exclude: (modulePath) => {
                    return (
                        /node_modules/.test(modulePath) &&
                        !/node_modules\/amdfriend/.test(modulePath)
                    );
                },
                loader: 'babel-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.ts'],
        alias: {
            "amdfriend/src": path.resolve(__dirname, "node_modules/amdfriend/src"),
            "@src": path.resolve(__dirname, "src"),
            "@patches": path.resolve(__dirname, "src", "patches"),
        }
    },
};
