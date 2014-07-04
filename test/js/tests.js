var publicMethods = [
  'showExpander',
  'hideExpander',
  'update',
  'updateElementsPosition',
  'updateExpanderPosition',
  'resizeHeight',
  'showItemByIndex',
  'next',
  'prev',
  'bindAll',
  'unbindAll',
  'destroy'
],
createCallbacks = function () {
  var i = 8,
      callbacks = [];
  while(i--) {
    callbacks.push(sinon.spy());
  }
  return callbacks;
},
  teardown = function () {
    $('.demo').remove();
  };

describe('Core Tests', function () {

  var callbacks = createCallbacks(),
    $list = $('.GITheWall li'),
    wall = $('.GITheWall').GITheWall({
      onBeforeInit: callbacks[0],
      onReady: callbacks[1],
      onViewPortUpdate: callbacks[2],
      onItemChange: callbacks[3],
      onDestroy: callbacks[4],
      onShow: callbacks[5],
      onHide: callbacks[6],
      onContentLoading: callbacks[7],
      onContentLoaded: callbacks[8]
    }),
    $expander = $('.GI_TW_expander');

  it('$.fn.GITheWall function exsists', function () {
    expect($.fn.GITheWall).is.not.undefined;
  });
  it('All the public methods are available', function () {
    $.each(publicMethods, function (i, method) {
      expect(wall[method]).to.be.a('function');
    });
  });
  it('It loads corrctly the image links', function (done) {
    expect($expander.length).to.be.equal(1);
    $list.eq(0).trigger('click');
    expect($expander.hasClass('opened')).to.be.true;
    setTimeout(function () {
      expect($('.GI_TW_fullimg img').length).to.be.equal(1);
      done();
    }, 500);
  });
  it('It loads corrctly the ajax links', function (done) {
    this.timeout(5000);
    expect($expander.length).to.be.equal(1);
    $list.filter('.ajax-test').trigger('click');
    expect($expander.hasClass('opened')).to.be.true;
    setTimeout(function () {
      expect($('.GI_TW_expander-inner .ajax').length).to.be.equal(1);
      done();
    }, 2000);
  });
  it('The destroy method works as expected', function () {
    wall.destroy();
    expect($('.GI_TW_expander').length).to.be.equal(0);
  });
  it('The public api has been created and the callbacks get called', function () {
    $.each(callbacks, function (i, callback) {
       expect(callback).to.have.been.called;
    });
    teardown();
  });
});