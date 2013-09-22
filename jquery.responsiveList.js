(function ( $ ) {
    function cssParser(value) {
        this.expression = new RegExp('(\\d+)((?:px)|(?:%)|(?:em)|(?:){0})$');
        this.source = '0px';
        this.unit = 'px';
        this.numericValue = 0;

        this.minimumMargin = 0;
        this.maximumMargin = 0;

        if(value) {
            this.parse(value);
        }
    }

    cssParser.prototype.parse = function(value) {
        var matches = this.expression.exec(value);
        if(matches) {
            this.source = matches[0];
            this.numericValue = matches[1];
            this.unit = matches[2];
        }
    }

    cssParser.prototype.isPixel = function() {
        if(this.unit == 'px') {
            return true;
        }
        if(!this.isPercentage()) {
            return true;
        }
    }

    cssParser.prototype.isPercentage = function() {
        if(this.unit == '%') {
            return true;
        }
        return false;
    }

    cssParser.prototype.numeric = function() {
        return Number(this.numericValue);
    }

    function cssDistanceCalculator() {
    }

    cssDistanceCalculator.prototype.calculatePixel = function(value, reference) {
        var valueParser = new cssParser(value);
        var referenceParser = new cssParser(reference);

        if(valueParser.isPercentage() && referenceParser.isPixel()) {
            return (valueParser.numeric() / 100) * referenceParser.numeric();
        }
        return valueParser.numeric();
    }

    cssDistanceCalculator.prototype.calculatePercentage = function(value, reference) {
        var valueParser = new cssParser(value);
        var referenceParser = new cssParser(reference);

        if(valueParser.isPixel() && referenceParser.isPixel()) {
            return (valueParser.numeric() / referenceParser.numeric()) * 100;
        }

        return valueParser.numeric();
    }


    function responsiveList(listElement, settings) {
        this.listElement = listElement;
        this.settings = settings;
        this.firstChild = $(this.listElement).find('li');
        this.responsiveDimensions = new Array(0, 0);
        this.listDimensions = new Array(0, 0);
        this.childDimensions = new Array(0, 0);
    }

    responsiveList.prototype.calculateDimensions = function(element) {
        var dimensions = new Array(0, 0);
        dimensions[0] = $(element).innerWidth();
        dimensions[1] = $(element).innerHeight();
        return dimensions;
    }

    responsiveList.prototype.calculateSettings = function(listDimensions) {
        var calc = new cssDistanceCalculator();

        this.minimumMargin = calc.calculatePixel(this.settings.minimumMargin, listDimensions[0]);
        this.maximumMargin = calc.calculatePixel(this.settings.maximumMargin, listDimensions[0]);

        this.minimumWidth = calc.calculatePixel(this.settings.minimumWidth, listDimensions[0]);
        this.maximumWidth = calc.calculatePixel(this.settings.maximumWidth, listDimensions[0]);

        this.minimumHeight = calc.calculatePixel(this.settings.minimumHeight, listDimensions[1]);
        this.maximumHeight = calc.calculatePixel(this.settings.maximumHeight, listDimensions[1]);
    }

    responsiveList.prototype.calculateChildrenCount = function(element) {
        return $(element).children().length;
    }

    responsiveList.prototype.calculateChildrenPerRow = function(listWidth, childWidth) {
        return Math.floor(listWidth / (childWidth + this.minimumMargin));
    }

    responsiveList.prototype.calculateTrueChildrenPerRow = function(childrenPerRow, childrenCount) {
        var emptyChildrenPerRow = 0;

        if(this.settings.fillEmptyChildren) {
            if(childrenCount < childrenPerRow) {
                emptyChildrenPerRow = childrenPerRow - childrenCount;
            }
        }

        return childrenPerRow - emptyChildrenPerRow;
    }

    responsiveList.prototype.calculateEmptySpace = function(listWidth, childWidth, trueChildrenPerRow) {
        var childSpace = trueChildrenPerRow * childWidth;
        var restSpace = listWidth % childSpace;
        var emptyChildSpace = listWidth - childSpace;

        if(emptyChildSpace > restSpace) {
            return emptyChildSpace;
        } else {
            return restSpace;
        }
    }

    responsiveList.prototype.calculateChildEmptySpace = function(emptySpace, trueChildrenPerRow) {
        var space = 0;

        if(trueChildrenPerRow > 1) {
            space =  Math.floor(emptySpace / (trueChildrenPerRow - 1));
        } else {
            space = emptySpace;
        }

        return space;
    }

    responsiveList.prototype.calculateMargin = function(childEmptySpace) {
        if(this.settings.responsiveMargin) {
            var margin = childEmptySpace;

            if(margin < this.minimumMargin) {
                margin = this.minimumMargin;
            }

            if(margin > this.maximumMargin && this.maximumMargin != 0) {
                return this.maximumMargin;
            }
            return margin
        } else {
            return this.minimumMargin;
        }
    }

    responsiveList.prototype.calculateResponsiveDimensions = function(childEmptySpace, childDimensions) {
        var dimensions = childDimensions;

        if(this.settings.responsiveScale) {
            dimensions[0] = dimensions[0] + childEmptySpace;
        }

        return dimensions;
    }

    responsiveList.prototype.calculate = function() {
        // calculate list width
        this.oldListDimensions = this.listDimensions;
        this.listDimensions = this.calculateDimensions(this.listElement);

        // calculate child width
        this.oldChildDimensions = this.childDimensions;
        this.childDimensions = this.calculateDimensions(this.firstChild);

        // calculate settings
        if(this.oldListDimensions[0] != this.listDimensions[0]) {
            this.calculateSettings(this.listDimensions[0]);
        }

        // calculate children count
        this.oldChildrenCount = this.childrenCount;
        this.childrenCount = this.calculateChildrenCount(this.listElement);

        // calculate children per row
        if(this.oldListDimensions[0] != this.listDimensions[0] || this.oldChildDimensions[0] != this.childDimensions[0]) {
            this.oldChildrenPerRow = this.childrenPerRow;
            this.childrenPerRow = this.calculateChildrenPerRow(this.listDimensions[0], this.childDimensions[0]);
        }

        // calculate true children per row
        if(this.oldChildrenPerRow != this.childrenPerRow || this.oldChildrenCount != this.childrenCount) {
            this.oldTruChildrenPerRow = this.trueChildrenPerRow;
            this.trueChildrenPerRow = this.calculateTrueChildrenPerRow(this.childrenPerRow, this.childrenCount);
        }

        // calculate empty space
        if(this.listDimensions[0] != this.listDimensions[0] || this.oldChildDimensions[0] != this.childDimensions[0] || this.oldTruChildrenPerRow != this.trueChildrenPerRow) {
            this.oldEmptySpace = this.emptySpace;
            this.emptySpace = this.calculateEmptySpace(this.listDimensions[0], this.childDimensions[0], this.trueChildrenPerRow);
        }

        // calculate child empty space
        if(this.oldEmptySpace != this.emptySpace || this.oldTruChildrenPerRow != this.trueChildrenPerRow) {
            this.oldChildEmptySpace = this.childEmptySpace;
            this.childEmptySpace = this.calculateChildEmptySpace(this.emptySpace, this.trueChildrenPerRow);
        }

        // calculate margin
        if(this.oldChildEmptySpace != this.childEmptySpace) {
            this.oldMargin = this.margin;
            this.margin = this.calculateMargin(this.childEmptySpace);
        }

        this.responsiveDimensions = this.calculateResponsiveDimensions(this.childEmptySpace, this.childDimensions);

        console.log('childWidth: '+this.childDimensions[0]);
        console.log('childrenCount: '+this.childrenCount);
        console.log('trueChildren: '+this.trueChildrenPerRow);
        console.log('empty space: '+this.emptySpace);
        console.log('child empty space: '+this.childEmptySpace);
        console.log('margin: '+this.margin);
        console.log('responsive dimensions: width: '+this.responsiveDimensions[0]+' height: '+this.responsiveDimensions[1]);
    }

    responsiveList.prototype.adjustMargin = function(element, i, margin, trueChildrenPerRow) {
        var currentMargin = 0;

        if(i < trueChildrenPerRow) {
            currentMargin = margin;
        } else {
            currentMargin = 0;
            if(trueChildrenPerRow == 1) {
                currentMargin = margin;
            }
        }

        $(element).css('margin-right', currentMargin+'px');
    }

    responsiveList.prototype.adjustScale = function(element, responsiveDimensions) {
        $(element).css('width', responsiveDimensions[0]+'px');
        $(element).css('height', responsiveDimensions[1]+'px');
    }

    responsiveList.prototype.adjust = function(trueChildrenPerRow, margin, responsiveDimensions) {
        var _this = this;
        var i = 0;
        $(this.listElement).children().each(function() {
            i++;

            _this.adjustMargin(this, i, margin, trueChildrenPerRow);
            _this.adjustScale(this, responsiveDimensions);

            if(i >= trueChildrenPerRow) {
                i = 0;
            }
        });
    }

    responsiveList.prototype.responsive = function() {
        this.calculate();
        this.adjust(this.trueChildrenPerRow, this.margin, this.responsiveDimensions);
    }

    var PLUGIN_IDENTIFIER = 'responsiveList';

    var methods = {
        init : function(options) {
            var _this = this;
            var settings = $.extend({
                minimumMargin: 25,
                maximumMargin: 0,

                minimumWidth: 200,
                maximumWidth: 400,

                minimumHeight: 0,
                maximumHeight: 0,

                fillEmptyChildren: true,
                scalePoroptional: true,
                responsiveMargin: true,
                responsiveScale: false,
                preferScale: false,
                preferMargin: false
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