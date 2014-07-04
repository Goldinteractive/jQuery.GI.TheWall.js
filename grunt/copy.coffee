module.exports = main:
  files: [
    {
      expand: true
      cwd: 'assets'
      src: [
        'css/**'
        'img/**'
      ]
      dest: 'dist/assets'
    }
    {
      expand: true
      src: ['*.!(json|rb|md|js)']
      dest: 'dist'
      filter: 'isFile'
    }
  ]