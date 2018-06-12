var path = require("path");

var config = require("config");
var gulp = require("gulp");
var webpack = require("webpack-stream");
var gulpClean = require("gulp-clean");
var gulpSequence = require("gulp-sequence");
var named = require("vinyl-named");

const PATH = config.get("prefix");

const utils = {
	assetsPath: function (_path) {
		return path.posix.join(_path)
	}
}

gulp.task("resClean", function () {
	return gulp.src("assets", {
			read: false
		})
		.pipe(gulpClean());
});
gulp.task("resCopy", function () {
	return gulp.src("static/**")
		.pipe(gulp.dest("assets"));
});
gulp.task("resWebpack", function () {
	return gulp.src("assets/js/entry*.js")
		.pipe(named())
		.pipe(webpack({
			output: {
				publicPath: PATH,
				filename: "[name].js"
			},
			module: {
				loaders: [{
						test: /\.js$/,
						loader: "babel-loader",
						exclude: /node_modules/
					},
					{
						test: /\.vue$/,
						loader: 'vue-loader'
					},
					{
						test: /\.css$/,
						loader: 'style-loader!css-loader'
					},
					{
						test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
						loader: 'url-loader',
						options: {
							limit: 10000,
							name: utils.assetsPath('img/[name].[hash:7].[ext]')
						}
					},
					{
						test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
						loader: 'url-loader',
						options: {
							limit: 10000,
							name: utils.assetsPath('media/[name].[hash:7].[ext]')
						}
					},
					{
						test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
						loader: 'url-loader',
						options: {
							limit: 10000,
							name: utils.assetsPath('fonts/[name].[hash:7].[ext]')
						}
					}
				]
			}
		}))
		.pipe(gulp.dest("assets/dist"));
})
gulp.task("resWatch", function () {
	return gulp.watch(["static/**"], ['dev']);
})

gulp.task("dev", gulpSequence("resClean", "resCopy", "resWebpack", "resWatch"));