const fs = require('fs');
const webpack = require('webpack');
const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;
const webpackMerge = require('webpack-merge');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const commonConfig = require('./../webpack.common');
const util = require('./../util');

module.exports = (gulp, params) => {
  gulp.task('build:types', done => {
    cd('./src/common_module');
    exec('tsc');
    cd('../../'); // 退回到根目录
    fs.writeFileSync('./node_modules/@types/app/index.d.ts', 'export {};', 'utf8');
    done();
  });

  gulp.task('app:html', () => {
    return gulp.src('index.html')
      .pipe(gulp.dest('dist/'));
  });

  gulp.task('app:watch', done => {
    gulp.watch('index.html', gulp.series('app:html', 'bs-reload'));
    done();
  });

  gulp.task('app:js', done => {
    let opt = webpackMerge(commonConfig, {
      entry: {
        app: './src/index.ts',
        common: './src/common_module/index.ts'
      },
      output: {
        path: util.root('dist'),
        filename: 'app/[name].js',
        library: ['ampApp', '[name]'],
        chunkFilename: '[id].js'
      },
      plugins: [
        new webpack.DefinePlugin({
          'process.env': {
            NODE_ENV: params.isRelease ? '"production"' : '"development"'
          }
        }),
        new ExtractTextPlugin({ filename: 'app/[name].css', disable: false, allChunks: true })
      ]
    });
    if (params.isRelease) {
      opt.plugins.push(new UglifyJsPlugin({
        compress: {
          warnings: false
        }
      }));
    }
    const compiler = webpack(opt);
    if (params.isRelease) {
      compiler.run((err, stats) => {
        util.showWebpackError(err, stats);
        gulp.series('bs-reload')();
        done();
      });
    } else {
      compiler.watch({ aggregateTimeout: 500, poll: false, ignored: [/modules/, /dist/] }, (err, stats) => {
        util.showWebpackError(err, stats);
        gulp.series('bs-reload')();
        done();
      });
    }
  });
  const tasks = ['app:html', 'app:js'];
  if (!params.isRelease) {
    tasks.push('app:watch');
  }
  gulp.task('app', gulp.parallel(...tasks));
};
