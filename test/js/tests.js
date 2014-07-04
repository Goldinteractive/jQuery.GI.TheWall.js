var publicMethods = [
  'setViewport',
  'startAutoslide',
  'stopAutoslide',
  'moveToSlide',
  'next',
  'prev',
  'bindAll',
  'unbindAll'
];

describe('Core Tests', function () {
  it('$.fn.GITheWall function exsists', function () {
    expect($.fn.GITheWall).is.not.undefined;
  });
});
