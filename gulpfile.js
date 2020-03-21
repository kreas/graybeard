const gulp = require('gulp')

// Utils
const browserSync = require("browser-sync").create();
const clean = require('gulp-clean')
const rename = require('gulp-rename')

// Pug stuffs
const pug = require('gulp-pug')

// CSS stuffs
const postcss = require('gulp-postcss')
const cleanCSS = require('gulp-clean-css')

// Rollup stuffs
const { rollup } = require('rollup')
const resolve = require('@rollup/plugin-node-resolve')
const commonjs = require('@rollup/plugin-commonjs')
const babel = require('rollup-plugin-babel')

const { buildDir } = require('./graybeard.config')

let cache

// Destroys the build directory
gulp.task('clean', () => {
  return gulp.src(buildDir, { allowEmpty: true }).pipe(clean())
})

// Compiles javascript using rollup
gulp.task('javascript', () => {
  const input = 'src/index.js'

  return rollup({
    input,
    plugins: [
      resolve(),
      commonjs(),
      babel({
        presets: ['@babel/env'],
        exclude: 'node_modules/**',
        babelrc: false
      })
    ]
  }).then(bundle => {
    bundle.write({
      file: `${buildDir}/bundle.js`,
      format: 'umd',
      name: 'library',
      sourcemap: true
    })

    browserSync.stream()
  })
})

// Compiles pug files
gulp.task('markup', () => {
  return gulp
    .src(['src/**/*.pug', '!src/lib/**/*.pug'])
    .pipe(pug())
    .pipe(rename((path) => {
      if (path.basename !== 'index') {
        path.dirname += '/' + path.basename
        path.basename = "index"
      }
    }))
    .pipe(gulp.dest(buildDir))
    .pipe(browserSync.stream())
})

// Compiles stylesheets using postcss
gulp.task('stylesheets', () => {
  return gulp
    .src(['src/index.css', '!src/lib/**/*.css'])
    .pipe(postcss([
      require('postcss-easy-import'),
      require('postcss-nested'),
      require('tailwindcss'),
      require('autoprefixer')
    ]))
    .pipe(cleanCSS({ compatibility: 'ie8' }))
    .pipe(gulp.dest(buildDir))
    .pipe(browserSync.stream())
})


// Copies assets to the build directory
gulp.task('assets', () => {
  return gulp.src('src/**/*.{png,jpg,gif,svg,ico}')
    .pipe(gulp.dest(buildDir))
})

//
gulp.task('build', gulp.parallel(
  'markup',
  'javascript',
  'stylesheets',
  'assets'
))

// Watches for changes and rebuilds the project as necessary
gulp.task('watch', () => {
  gulp.watch('src/**/*.css', gulp.series('stylesheets'))
  gulp.watch('src/**/*.{pug, json}', gulp.series('markup'))
  gulp.watch('src/**/*.{png,jpg,svg,ico}', gulp.series('assets'))
  gulp.watch('src/**/*.js', gulp.series('javascript'))
})

gulp.task('serve', () => {
  browserSync.init({
    server: buildDir,
    port: 4200,
    snippetOptions: {
      rule: {
        match: /<\/head>/i,
        fn: function (snippet, match) {
          return snippet + match;
        }
      }
    }
  })
})

gulp.task('default',
  gulp.series(
    'clean',
    'build',
    gulp.parallel('serve', 'watch')
  )
)
