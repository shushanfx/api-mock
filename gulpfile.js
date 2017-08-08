var path = require("path");

var gulp = require("gulp");
var webpack = require("webpack-stream");
var gulpClean = require("gulp-clean");
var gulpSequence = require("gulp-sequence");
var named = require("vinyl-named");

gulp.task("resClean", function () {
	return gulp.src("assets", { read: false })
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
				filename: "[name].js"
			},
			module: {
				loaders: [
					{ test: /\.js$/, loader: "babel-loader", exclude: /node_modules/ },
					{ test: /\.vue$/, loader: 'vue-loader' },
					{ test: /\.css$/, loader: 'style-loader!css-loader' }
				]
			},
			resolve: {
				alias: { "vue": path.resolve(__dirname, "node_modules", "vue", "dist", "vue.min.js") }
			}
		}))
		.pipe(gulp.dest("assets/dist"));
})
gulp.task("resWatch", function () {
	return gulp.watch(["static/**"], ['dev']);
})

gulp.task("dev", gulpSequence("resClean", "resCopy", "resWebpack", "resWatch", "resWatch"));

