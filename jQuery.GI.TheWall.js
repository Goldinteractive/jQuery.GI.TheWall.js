/*!
 *
 * Version 0.1.2
 * This class could be used to create image wall similar to the google image search
 * Copyright Gold Interactive 2013
 * Author: Gianluca Guarini
 *
 */

(function (document, window, $document, $window, $body, $) {
  'use strict';

  /**
   *
   * Dependencies
   *
   */
  $.support.transition = (function () {

    var transitionEnd = (function () {

      var el = document.createElement('GI'),
        transEndEventNames = {
          'WebkitTransition': 'webkitTransitionEnd',
          'MozTransition': 'transitionend',
          'OTransition': 'oTransitionEnd otransitionend',
          'transition': 'transitionend'
        },
        name;

      for (name in transEndEventNames) {
        if (el.style[name] !== undefined) {
          return transEndEventNames[name];
        }
      }

    }());

    return transitionEnd && {
      end: transitionEnd
    };

  })();
  var GI_TW_ID = 0,
    TheWall = function ($el, myOptions) {

      /*
       *
       * GLOBAL PROTECTED VAR
       *
       */

      var self = this,
        defaultOptions = {
          // Callbacks API
          onBeforeInit: null,
          onReady: null,
          onViewPortUpdate: null,
          onItemChange: null,
          onDestroy: null,
          onShow: null,
          onHide: null,
          onContentLoading: null,
          onContentLoaded: null,
          margin: {
            top: 10,
            bottom: 10
          },
          scrollerElm: null,
          scrollOffset: 150,
          // settings
          arrows: true,
          closebutton: true,
          keyboardNavigation: true,
          animationSpeed: 300,
          autoscroll: true,
          responsive: true,
          initialWrapperHeight: 600,
          dynamicHeight: true,
          nextButtonClass: '',
          prevButtonClass: '',
          closeButtonClass: ''
        },
        istouch = 'ontouchstart' in window || window.DocumentTouch && document instanceof DocumentTouch,
        keyboardKeys = [33, 34, 35, 36, 37, 38, 39, 40, 27],
        isOpened = false,
        // If Modernizr is undefined we give the priority to the javascript animations
        csstransitions = $.support.transition,
        isLoading = false,
        cachedWrapperHeight = 0,
        eventsNamespace = '.GITheWall' + GI_TW_ID,
        eventsNames = {
          click: istouch ? "touchstart" : "click",
          mousedown: istouch ? "touchstart" : "mousedown",
          mouseup: istouch ? "touchend" : "mouseup",
          mousemove: istouch ? "touchmove" : "mousemove",
          mouseleave: istouch ? "touchleave" : "mouseleave"
        },
        options = $.extend(defaultOptions, myOptions);

      /*
       *
       * PUBLIC VAR
       *
       */
      this.$el = $el;
      this.$expanderWrapper = $('<div class="GI_TW_expander"></div>');
      this.$contentPointer = $('<div class="GI_TW_pointer"></div>');
      this.$expanderInner = $('<div class="GI_TW_expander-inner"></div>');
      this.$list = $('> ul', this.$el).eq(0);
      this.$items = $('> li', this.$list);
      this.itemsLength = this.$items.length;
      this.currentIndex = null;
      this.currentRowIndex = null;
      this.$selectedli = null;
      this.selectedLiData = null;


      /*
       *
       * PRIVATE METHODS
       *
       */

      /*
       *
       * Debounce function borrowed from lodash
       * http://lodash.com/docs#debounce
       *
       */

      Function.prototype.debounce = function (wait, immediate) {
        var func = this,
          timeout, result;
        return function () {
          var context = this,
            args = arguments;
          var later = function () {
            timeout = null;
            if (!immediate) result = func.apply(context, args);
          };
          var callNow = immediate && !timeout;
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
          if (callNow) result = func.apply(context, args);
          return result;
        };
      };


      /*
       *
       * Execute all the callbacks only if they are functions
       *
       */

      var execCallback = function (callback, arg) {
          if (typeof callback === 'function') {
            $.proxy(callback, self, arg)();
          }
        },


        /**
         * Build the navigation arrows html
         *
         */
        _buildArrows = function () {
          this.$expanderWrapper.append('<i class="GI_TW_arrow GI_TW_prev GI_TW_Controls"><span class="' + options.prevButtonClass + '"></span></i><i class="GI_TW_arrow GI_TW_next GI_TW_Controls"><span class="' + options.nextButtonClass + '"></span></i>');
          this.$next = $('.GI_TW_next', this.$expanderWrapper);
          this.$prev = $('.GI_TW_prev', this.$expanderWrapper);
        },


        /**
         *
         * Show and hide the arrows from the current slide index
         *
         */
        _updateArrows = function () {
          self.$prev.toggleClass('GI_TW_hidden', self.currentIndex <= 0);
          self.$next.toggleClass('GI_TW_hidden', self.currentIndex >= self.itemsLength - 1);
        },
        /**
         * Scroll smoothly the page to a certain value
         * @param  { Int } value: pixels from the top
         */
        _scrollTo = function (value) {
          if (!options.autoscroll) return false;
          $(options.scrollerElm || 'html,body').animate({
            scrollTop: value
          });
        },
        /**
         *
         * Append the class current over the active li selected
         *
         */
        _updateCurrentClass = function () {
          self.$items.removeClass('GI_TW_Current');
          if (typeof self.currentIndex === 'number')
            self.$items.eq(self.currentIndex).addClass('GI_TW_Current');
        },

        /**
         *
         * Append the class current over the active li selected
         *
         */
        _updateContentPointerPosition = function () {
          this.$contentPointer.css({
            left: this.selectedLiData.offset.left + this.$selectedli.width() / 2
          });
        },
        /**
         * Load inline content into the extender inner wrapper by using a jquery selector
         * @param  { String } selector: element to select in the page
         * @return { Object } jquery deferred object
         */
        _loadInlineContent = function (selector) {
          var dfr = new $.Deferred(),
            $el = $(selector).html();

          if (!$el.length) {
            throw new Error('No element can be found using the "' + selector + '" selector');
          }

          self.$expanderInner.html($el);
          dfr.resolve();
          return dfr.promise();
        },
        /**
         * Load an image inside the extender inner wrapper
         * @param  { String } src: image url
         * @return { Object } jquery deferred object
         */
        _loadImage = function (src) {
          var dfr = new $.Deferred(),
            img = new Image();
          img.onload = function () {
            self.$expanderInner.html('<div class="GI_TW_fullimg"><img src="' + src + '" /></div>');
            dfr.resolve();
            img = null;
          };

          img.src = src;
          return dfr.promise();
        },
        /**
         * Load html contents inside the extender inner wrapper via ajax
         * @param  { String } href: contents url
         * @return { Object } jquery deferred object
         */
        _loadAjaxContents = function (href) {
          var dfr = new $.Deferred();

          $.get(href, function (data) {
            self.$expanderInner.html(data);
            dfr.resolve();
          });

          return dfr.promise();
        },
        /**
         * Update the expander wrapper height
         * @param  { Float } newHeight: height to set to the expander wrapper
         */
        _updateExpanderWrapperHeight = function (newHeight) {
          this.$expanderInner.css({
            height: newHeight
          });
          if (newHeight === cachedWrapperHeight) return;
          cachedWrapperHeight = newHeight;
          this.$expanderWrapper
            .stop(true, false)
            .addClass(csstransitions ? 'animating' : '')[csstransitions ? 'css' : 'animate']({
              'height': newHeight
            }, options.animationSpeed);
          this.updateElementsPosition();
        },

        /*
         *
         * Callback triggered anytime a slide is changed
         *
         */

        _onItemChange = function () {

          // this.currentIndex must be always into a valid range
          if (this.selectedLiData.index < 0 || this.selectedLiData.index >= this.itemsLength) return;

          this.currentIndex = this.selectedLiData.index;

          this.loadInnerContents();

          execCallback(options.onItemChange, this.currentIndex);
        },


        _onKeypress = function (e) {
          if (!this.isOpened()) return;
          if (e.target.form !== undefined) return;
          if (e.target.isContentEditable) return;
          if ($.inArray(e.keyCode, keyboardKeys) > -1) {
            e.preventDefault();
          }
          if (e.keyCode === 39) {
            this.next();
          } else if (e.keyCode === 37) {
            this.prev();
          } else if (e.keyCode === 27) {
            this.hideExpander();
          }
        },

        _onArrowClicked = function (e) {
          e.stopImmediatePropagation();
          e.preventDefault();
          var $this = $(e.currentTarget);
          if ($this.hasClass('GI_TW_next')) this.next();
          else this.prev();
        },
        _init = function () {

          execCallback(options.onBeforeInit);

          if (options.arrows) {
            _buildArrows.call(this);
            _updateArrows();
          }

          if (options.closebutton) {
            this.$expanderWrapper.append('<div class="GI_TW_close GI_TW_Controls"><span class="' + options.closeButtonClass + '"></span></div>');
            this.$closebutton = $('.GI_TW_items', this.$expanderWrapper);
          }

          // append the expander html
          this.$expanderWrapper.append(this.$contentPointer);
          this.$expanderWrapper.append(this.$expanderInner);
          this.$el.prepend(this.$expanderWrapper);

          this.bindAll();

          execCallback(options.onReady);

          GI_TW_ID++;
        };
      /*
       *
       * PUBLIC METHODS
       *
       */



      /**
       *
       * Se the lis offset data
       *
       */
      this.setLisOffsets = function () {
        // these variables will be used inside the loop the get the li row position
        var cachedOffsetTop = 0,
          rowIndex = 0,
          $previousLi;
        // loop all the lis in the grid
        this.$items.each($.proxy(function (i, elm) {
          var $li = $(elm),
            liData = $li.data();
          // remove all the the wall classes
          $li.removeClass('GI_TW_First GI_TW_Last GI_TW_Index-' + liData.index + ' GI_TW_Row-' + liData.rowIndex);
          // check whether this li is in the current viewport

          // update the classes only of the visible lis
          var isFirst = false,
            tmpOffset = $li.position(),
            liPosition = {
              top: ~~tmpOffset.top,
              left: ~~tmpOffset.left
            };
          // increase by one row if the element has an offset different from the previous one
          // considering images having the same offset only the ones having an offset gap smaller than 6px (to fix a webkit weird behavior)
          if (liPosition.top >= cachedOffsetTop + 3 || liPosition.top <= cachedOffsetTop - 3) {
            if ($previousLi)
              $previousLi.addClass('GI_TW_Last');
            isFirst = true;
            rowIndex++;
          }
          // add the needed classes to detect the li inside the grid
          $li.addClass((isFirst ? 'GI_TW_First ' : ' ') + 'GI_TW_Index-' + i + ' GI_TW_Row-' + rowIndex);
          // store the wall data
          $li.data({
            rowIndex: rowIndex,
            offset: liPosition,
            index: i
          });
          $previousLi = $li;
          cachedOffsetTop = liPosition.top;

        }, this));
      };

      /*
       *
       * Update the class of all the elements according to their position in the grid
       *
       */

      this.setViewport = function () {

        if (!isOpened) return;
        // set the new offsets
        this.setLisOffsets();

        this.updateElementsPosition();

        _updateContentPointerPosition.call(this);

        execCallback(options.onViewPortUpdate);
      };
      /**
       * Load the contents of the a contained into the li selected
       */
      this.loadInnerContents = function () {
        var $a = this.$selectedli.find('a'),
          callback,
          href = this.selectedLiData.href || $a.attr('href');
        isLoading = true;

        this.$expanderInner.html('<div class="GI_TW_loading"></div>');

        if (!href) {
          console.warn('sorry.. it was not possible to load any content');
          return;
        } else {
          execCallback(options.onContentLoading);
          switch (this.selectedLiData.contenttype) {
          case 'ajax':
            callback = _loadAjaxContents(href);
            break;
          case 'inline':
            callback = _loadInlineContent(href);
            break;
          default:
            callback = _loadImage(href);
            break;
          }

          callback.then(function () {
            // set this value temporary to auto
            self.$expanderInner.css({
              height: 'auto'
            });

            var newHeight = options.dynamicHeight ? self.$expanderInner.outerHeight() : options.initialWrapperHeight;
            _updateExpanderWrapperHeight.call(self, newHeight);
            // update the DOM
            self.update();
            _scrollTo(self.$expanderWrapper.offset().top - options.scrollOffset);
            execCallback(options.onContentLoaded);
            isLoading = false;
          });
        }
      };

      /**
       * Open the expander div if it's closed otherwise just update the content inside
       * @param  { Object } e jQuery event object
       */
      this.showExpander = function (e) {
        e.preventDefault();
        // cache the seleced li
        this.$selectedli = $(e.currentTarget);
        if (this.$selectedli.length && this.$selectedli.hasClass('GI_TW_Current')) {
          this.hideExpander();
          return;
        }
        this.selectedLiData = this.$selectedli.data();

        // if the content wrapper is already visible we just change the current content
        if (isOpened) {
          _onItemChange.call(this);
          return;
        }

        isOpened = true;

        this.$expanderWrapper.addClass('opened');

        this.setViewport();
        _onItemChange.call(this);

        execCallback(options.onShow);

      };
      /**
       * Hide the expander cleaning its inner html
       */
      this.hideExpander = function () {
        this.$expanderWrapper.removeClass('opened').stop(true, false)[csstransitions ? 'css' : 'animate']({
          'height': 0
        }, options.animationSpeed);

        this.$expanderInner.empty();


        this.currentRowIndex = null;
        this.$selectedli = null;
        this.selectedLiData = null;
        this.currentIndex = null;
        cachedWrapperHeight = 0;

        this.$items.removeClass('GI_TW_Selected_Row').animate({
          marginBottom: 0
        }, options.animationSpeed);

        isOpened = false;

        _updateCurrentClass();

        execCallback(options.onHide);
      };

      /*
       *
       * Recalculate the plugin DOM elements
       * Use this method if you add or remove elements from the wall
       *
       */

      this.refresh = function () {
        this.$list = $('> ul', this.$el).eq(0);
        this.$items = $('> li', this.$list);
        if (!this.$list.has(this.$selectedli).length) {
          this.hideExpander();
        }
        this.itemsLength = this.$items.length;
        if (isOpened) {
          this.setLisOffsets();
          this.update();
        }
      };

      /*
       *
       * Update the plugin DOM elements
       *
       */

      this.update = function () {
        this.selectedLiData = this.$selectedli.data();

        _updateContentPointerPosition.call(this);
        if (this.selectedLiData.rowIndex !== this.currentRowIndex) {
          this.updateElementsPosition();
        }
        if (options.arrows) {
          _updateArrows();
        }

        _updateCurrentClass.call(this);

        this.currentRowIndex = this.selectedLiData.rowIndex;
      };
      /**
       * Update the elements position
       */
      this.updateElementsPosition = function () {

        this.$items.each(function (i, elm) {
          var $li = $(elm),
            liData = $li.data(),
            pushIt = liData && liData.rowIndex === self.selectedLiData.rowIndex;
          $li
            .toggleClass('GI_TW_Selected_Row', pushIt)
            .stop(true, false)[csstransitions ? 'css' : 'animate']({
              marginBottom: (pushIt ? Number(cachedWrapperHeight + options.margin.bottom) : 0)
            }, pushIt ? options.animationSpeed : 0);
        });
        this.setLisOffsets();
        this.updateExpanderPosition();

      };

      this.updateExpanderPosition = function () {
        if (!isOpened) return;
        var newTopPosition = this.selectedLiData.offset.top + this.$selectedli.height() + options.margin.top;
        // set expandWrapper top position
        this.$expanderWrapper.css({
          top: newTopPosition
        });
      };
      /**
       * Resize the height of the expander to any custom value
       * @param  { Int } newHeight: the new height value that must be set to the expander wrapper
       */
      this.resizeHeight = function (newHeight) {
        _updateExpanderWrapperHeight.call(this, newHeight);
        this.setViewport();
      };
      /**
       *
       * Show the content of any brick by selecting it via index
       * @param { Int }
       *
       */
      this.showItemByIndex = function (index) {
        var $currentLi = this.$items.eq(index);
        if ($currentLi.length) {
          this.$selectedli = $currentLi;
          this.selectedLiData = $currentLi.data();
          _onItemChange.call(this);
        }

      };

      /**
       * Returns true the expander id visible
       * @return {Boolean} [description]
       */
      this.isOpened = function () {
        return isOpened;
      };

      this.next = function () {
        if (isLoading || !isOpened || this.currentIndex === this.itemsLength - 1) return;
        this.showItemByIndex(this.currentIndex + 1);
      };

      this.prev = function () {
        if (isLoading || !isOpened || this.currentIndex === 0) return;
        this.showItemByIndex(this.currentIndex - 1);
      };

      /*
       *
       * Bind all the events needed
       *
       */

      this.bindAll = function () {

        if (csstransitions) {
          this.$expanderWrapper.on(csstransitions.end + eventsNamespace, function () {
            $(this).removeClass('animating');
          });
        }

        if (options.arrows) {
          this.$el.on(eventsNames.click + eventsNamespace, '.GI_TW_arrow', this.$expanderWrapper, $.proxy(_onArrowClicked, this));
        }

        if (options.closebutton) {
          this.$el.on(eventsNames.click + eventsNamespace, '.GI_TW_close', this.$expanderWrapper, $.proxy(this.hideExpander, this));
        }

        this.$el.on('click' + eventsNamespace, '> ul > li', $.proxy(this.showExpander, this));

        if (options.responsive)
          $window.on('resize' + eventsNamespace + ' orientationchange' + eventsNamespace, $.proxy(this.setViewport.debounce(300), this));
        if (options.keyboardNavigation)
          $window.on('keydown' + eventsNamespace, $.proxy(_onKeypress, this));

      };
      this.unbindAll = function () {
        this.$el.off(eventsNamespace);
        this.$expanderWrapper.off(eventsNamespace);
      };

      /*
       *
       * Remove all the events of the plugin
       *
       */

      this.destroy = function (e) {
        if (e) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
        this.hideExpander();

        this.unbindAll();
        this.$expanderWrapper.remove();
        execCallback(options.onDestroy);
      };

      _init.call(this);
      return this;
    };

  /*
   *
   * Exporting the class extending jQuery
   *
   */

  $.fn.GITheWall = function (myOptions) {
    if (!this.length) {
      return;
    }
    return new TheWall(this, myOptions);
  };

}(document, window, $(document), $(window), $('body'), jQuery));