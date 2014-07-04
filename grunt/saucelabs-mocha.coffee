module.exports = (grunt, options) =>
  all:
    options:
      urls: [
        'http://127.0.0.1:9999/test/tests.html'
      ]
      username: 'goldinteractive-open'
      key: 'bb3f9f3e-8dac-43bd-823f-16f7d998fe16'
      browsers: grunt.file.readJSON('test/saucelabs-browsers.json')
      build: process.env.TRAVIS_JOB_ID
      testname: 'jQuery.GI.TheWall.js'
      sauceConfig:
        'video-upload-on-pass': false


