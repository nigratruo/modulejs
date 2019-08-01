var gulp = require('gulp');
var gutil = require("gulp-util");
var webpack = require("webpack");
var webpack_dev_server = require("webpack-dev-server");
var webpack_config = require("./webpack.config.js");
var minimist = require('minimist');

var option = minimist(process.argv.slice(2), {
  string: ['env'],
  boolean: [],
  default: {
    env: process.env.NODE_ENV || 'development'
  }
});

var compiler, config, is_production;
process.env.NODE_ENV = option.env

switch(process.env.NODE_ENV){
  case 'production':
    break;
  default:
    // modify some webpack config options
    config = Object.create(webpack_config);
    config.devtool = "sourcemap";
    config.debug = true;
    compiler = webpack(config);
    break;
}

// The development server (the recommended option for development)
gulp.task("default", []);

// Build and watch cycle (another option for development)
// Advantage: No server required, can run app from filesystem
// Disadvantage: Requests are not blocked until bundle is available,
//               can serve an old app on refresh

// Production build
gulp.task("build", ["webpack:build"]);
gulp.task("build-dev", ["webpack:build-dev"], function() {
  gulp.watch(["src/**/*"], ["webpack:build-dev"]);
});

gulp.task("webpack:build", function(callback) {
  switch(process.env.NODE_ENV){
    case 'production':
      task_webpack_build_production(callback);
      break;
    default:
      task_webpack_build_development(callback);
      break;
  }
});

gulp.task("webpack:build-prod", task_webpack_build_production);
gulp.task("webpack:build-dev", task_webpack_build_development);

function task_webpack_build_production(callback){

  var config = Object.create(webpack_config);
  config.plugins = config.plugins.concat(
    new webpack.DefinePlugin({
      "process.env": {
        // This has effect on the react lib size
        "NODE_ENV": JSON.stringify("production")
      }
    }),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin()
  );
  config.output.filename = config.output.filename.replace(/\.js$/, '.min.js');

  webpack(config, function(err, stats) {
    if(err) throw new gutil.PluginError("webpack:build", err);
    gutil.log("[webpack:build]", stats.toString({
      colors: true
    }));
    callback();
  });
}

function task_webpack_build_development(callback){
  compiler.run(function(err, stats) {
    if(err) throw new gutil.PluginError("webpack:build-dev", err);
    gutil.log("[webpack:build-dev]", stats.toString({
      colors: true
    }));
    callback();
  });
}


gulp.task("webpack-dev-server", function(callback) {
  // modify some webpack config options
  var local_config = Object.create(config);
  local_config.devtool = "eval";
  local_config.debug = true;

  // Start a webpack-dev-server
  new WebpackDevServer(webpack(local_config), {
    publicPath: "/" + local_config.output.publicPath,
    stats: {
      colors: true
    }
  }).listen(8080, "localhost", function(err) {
    if(err) throw new gutil.PluginError("webpack-dev-server", err);
    gutil.log("[webpack-dev-server]", "http://localhost:8080/webpack-dev-server/index.html");
  });
});


