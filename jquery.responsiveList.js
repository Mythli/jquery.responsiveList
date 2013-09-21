(function ( $ ) {
    function responsiveList(listElement, settings) {
        this.listElement = listElement;
        this.settings = settings;
        this.firstChild = $(this.listElement).find('li');
    }

    responsiveList.prototype.calculateWidth = function(element) {
        return $(element).innerWidth();
    }

    responsiveList.prototype.calculateChildrenCount = function(element) {
        return $(element).children().length;
    }

    responsiveList.prototype.calculateChildrenPerRow = function(listWidth, childWidth) {
        return Math.floor(listWidth / (childWidth + this.settings.minimumMargin));
    }

    responsiveList.prototype.calculateTrueChildrenPerRow = function(childrenPerRow, childrenCount) {
        var emptyChildrenPerRow = 0;

        if(childrenCount < childrenPerRow) {
            emptyChildrenPerRow = childrenPerRow - childrenCount;
        }

        return childrenPerRow - emptyChildrenPerRow;
    }

    responsiveList.prototype.calculateEmptySpace = function(listWidth, childWidth, trueChildrenPerRow) {
        var childSpace = trueChildrenPerRow * childWidth;
        var restSpace = listWidth % (childSpace);
        var emptyChildSpace = listWidth - childSpace;

        if(emptyChildSpace > restSpace) {
            return emptyChildSpace;
        } else {
            return restSpace;
        }
    }
    responsiveList.prototype.calculateMargin = function(emptySpace, trueChildrenPerRow) {
        var margin =  Math.floor(emptySpace / (trueChildrenPerRow - 1));
        if(margin < this.settings.minimumMargin) {
            margin = this.settings.minimumMargin;
        }
        return margin;
    }

    responsiveList.prototype.calculate = function() {
        // calculate list width
        this.oldListWidth = this.listWidth;
        this.listWidth = this.calculateWidth(this.listElement);

        // calculate child width
        this.oldChildWidth = this.childWidth;
        this.childWidth = this.calculateWidth(this.firstChild);
        console.log('childWidth: '+this.childWidth);

        // calculate children count
        this.oldChildrenCount = this.childrenCount;
        this.childrenCount = this.calculateChildrenCount(this.listElement);
        console.log('childrenCount: '+this.childrenCount);

        // calculate children per row
        if(this.oldListWidth != this.listWidth || this.oldChildWidth != this.childWidth) {
            this.oldChildrenPerRow = this.childrenPerRow;
            this.childrenPerRow = this.calculateChildrenPerRow(this.listWidth, this.childWidth);
        }

        // calculate true children per row
        if(this.oldChildrenPerRow != this.childrenPerRow || this.oldChildrenCount != this.childrenCount) {
            this.oldTruChildrenPerRow = this.trueChildrenPerRow;
            this.trueChildrenPerRow = this.calculateTrueChildrenPerRow(this.childrenPerRow, this.childrenCount);
        }

        // calculate empty space
        if(this.oldListWidth != this.listWidth || this.oldChildWidth != this.childWidth || this.oldTruChildrenPerRow != this.trueChildrenPerRow) {
            this.oldEmptySpace = this.emptySpace;
            this.emptySpace = this.calculateEmptySpace(this.listWidth, this.childWidth, this.trueChildrenPerRow);
            console.log('empty space: '+this.emptySpace);
        }

        // calculate margin
        if(this.oldEmptySpace != this.emptySpace || this.oldTruChildrenPerRow != this.trueChildrenPerRow) {
            this.oldMargin = this.margin;
            this.margin = this.calculateMargin(this.emptySpace, this.trueChildrenPerRow);
        }
    }

    responsiveList.prototype.adjust = function(margin, trueChildrenPerRow) {
        var _this = this;
        var i = 0;
        $(this.listElement).children().each(function() {
            var currentMargin = 0;
            i++;
            if(i < trueChildrenPerRow) {
                currentMargin = margin;
            } else {
                currentMargin = 0;
                i = 0;
            }

            $(this).css('margin-right', currentMargin+'px');
        });
    }

    responsiveList.prototype.responsive = function() {
        this.calculate();
        if(this.oldMargin != this.margin || this.oldTruChildrenPerRow != this.trueChildrenPerRow) {
            this.adjust(this.margin, this.trueChildrenPerRow);
        }
    }

    var PLUGIN_IDENTIFIER = 'responsiveList';

    var methods = {
        init : function(options) {
            var _this = this;
            var settings = $.extend({
                minimumMargin: 20,
                maximumMargin: 40
            }, options);

            $(this).each(function() {
                var responsiveApi = new responsiveList(this, settings);
                $(this).data(PLUGIN_IDENTIFIER+'Settings', settings);
                $(this).data(PLUGIN_IDENTIFIER+'Api', responsiveApi);
            });

            $(window).on('resize.'+PLUGIN_IDENTIFIER, function() {
                $(_this).responsiveList('responsive');
            });

            $(this).responsiveList('responsive');
        },

        responsive: function() {
            $(this).each(function() {
                $(this).responsiveList('api').responsive();
            });
        },

        api: function() {
            return $(this).data(PLUGIN_IDENTIFIER+'Api');
        },

        destroy: function() {
            $(window).off('resize.'+PLUGIN_IDENTIFIER);

            this.each(function() {
                $(this).removeData(PLUGIN_IDENTIFIER+'Settings');
                $(this).removeData(PLUGIN_IDENTIFIER+'Api');
            });
        }
    };

    $.fn.responsiveList = function(methodOrOptions) {
        if ( methods[methodOrOptions] ) {
            return methods[ methodOrOptions ].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof methodOrOptions === 'object' || ! methodOrOptions ) {
            // prevent re-initialization
            if(!$(this).data(PLUGIN_IDENTIFIER)) {
                return methods.init.apply( this, arguments );
            }
        } else {
            $.error( 'Method ' +  method + ' does not exist on jQuery.'+PLUGIN_IDENTIFIER );
        }
    };

    $.responsiveList = function() {

    }
}( jQuery ));