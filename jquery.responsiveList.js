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

    function cssSize(width, height) {
        this.width = 0;
        this.height = 0;

        if(width) {
            this.width = width;
        }

        if(height) {
            this.height = height;
        }
    }

    function cssDistanceCalculator() {
    }

    cssDistanceCalculator.calculatePixel = function(value, reference) {
        var valueParser = new cssParser(value);
        var referenceParser = new cssParser(reference);

        if(valueParser.isPercentage() && referenceParser.isPixel()) {
            return (valueParser.numeric() / 100) * referenceParser.numeric();
        }
        return valueParser.numeric();
    }

    cssDistanceCalculator.calculatePercentage = function(value, reference) {
        var valueParser = new cssParser(value);
        var referenceParser = new cssParser(reference);

        if(valueParser.isPixel() && referenceParser.isPixel()) {
            return (valueParser.numeric() / referenceParser.numeric()) * 100;
        }

        return valueParser.numeric();
    }


    function responsiveList(listElement, settings) {
        this.rawSettings = settings;
        this.listElement = listElement;
        this.firstChild = $(listElement).find('li');
        this.listSize = new cssSize();
        this.nodeSize = new cssSize();
    }


    // calculators

    responsiveList.calcSize = function(listElement) {
        return new cssSize($(listElement).innerWidth(), $(listElement).innerHeight());
    }

    responsiveList.calcNodeCount = function(listElement) {
        return $(listElement).children().length;
    }

    responsiveList.calcRowNodesGuess = function(listWidth, childWidth) {
        return Math.floor(listWidth / childWidth);
    }

    responsiveList.calcRowNodes = function(rowNodesGuess, nodeCount) {
        if(rowNodesGuess > nodeCount) {
            return nodeCount;
        }
        return rowNodesGuess;
    }

    responsiveList.calcEmptySpace = function(listWidth, nodeWidth, rowNodes) {
        var nodesSpace = rowNodes * nodeWidth;
        var restSpace = listWidth % nodesSpace;
        var emptySpace = listWidth - nodesSpace;

        if(emptySpace > restSpace) {
            return emptySpace;
        } else {
            return restSpace;
        }
    }

    responsiveList.calcAdditionalSpace = function(emptySpace, rowNodes) {
        return emptySpace / rowNodes;
    }

    responsiveList.calcMargin = function(emptySpace, rowNodes) {
        var margin = emptySpace;
        if(rowNodes > 1) {
            margin = emptySpace / (rowNodes - 1);
        }

        //alert(emptySpace+'+'+rowNodes+'+'+margin);
        return margin;
    }

    responsiveList.calcScale = function(size, freeSpace, propotional) {
        var scaledSize = new cssSize(size.width, size.height);
        scaledSize.width = scaledSize + freeSpace;
        return scaledSize;
    }

    responsiveList.prototype.getRowNodes = function() {
            var rowNodes = responsiveList.calcRowNodesGuess(this.listSize.width, this.nodeSize.width + this.settings.minimumMargin);

            if(this.settings.fillEmptyChildren) {
                rowNodes = responsiveList.calcRowNodes(rowNodes, this.nodeCount);
            }

        return rowNodes;
    }

    responsiveList.prototype.getEmptySpace = function() {
        return responsiveList.calcEmptySpace(this.listSize.width, this.nodeSize.width, this.rowNodes);
    }

    responsiveList.prototype.getAdditionalSpace = function() {
        this.oldAdditionalSpace = this.additionalSpace;
        if(!this.settings.cache || this.margin == undefined || this.getEmptySpace() != this.oldEmptySpace || this.getRowNodes()  != this.oldRowNodes) {
            this.additionalSpace = responsiveList.calcAdditionalSpace(this.getEmptySpace(), this.getRowNodes());

            console.log('new additional space: '+this.additionalSpace);
        }

        return this.additionalSpace;
    }

    responsiveList.prototype.getMargin = function() {
        if(!this.settings.responsiveMargin) {
            return this.settings.minimumMargin;
        }

         var margin = responsiveList.calcMargin(this.emptySpace, this.rowNodes);
         if(!this.settings.precise) {
             margin = Math.floor(margin);
         }

         if(margin < this.settings.minimumMargin) {
            margin = this.settings.minimumMargin;
         }

        if(margin > this.settings.maximumMargin && this.settings.maximumMargin != 0) {
            margin = this.settings.maximumMargin;
        }

        return margin;
    }

    responsiveList.prototype.getScale = function() {
        //return responsiveList.calcScale(this.nodeSize, )
    }

    responsiveList.prototype.processSettings = function(settings) {
        var settings = $.extend(true, settings, {
            minimumMargin: cssDistanceCalculator.calculatePixel(settings.minimumMargin, this.listSize.width),
            maximumMargin: cssDistanceCalculator.calculatePixel(settings.maximumMargin, this.listSize.width),

            minimumWidth: cssDistanceCalculator.calculatePixel(settings.minimumWidth, this.listSize.width),
            minimumWidth: cssDistanceCalculator.calculatePixel(settings.maximumWidth, this.listSize.width),

            minimumWidth: cssDistanceCalculator.calculatePixel(settings.minimumHeight, this.listSize.width),
            minimumWidth: cssDistanceCalculator.calculatePixel(settings.maximumHeight, this.listSize.width)
        });

        return settings;
    }

    responsiveList.prototype.applyMargin = function(element, index) {

        var margin = this.margin;
        if(index == this.rowNodes) {
            margin = 0;
        }
        if(this.rowNodes == 1) {
            margin = this.margin;
        }

        $(element).css('margin-right', margin+'px');
    }

    responsiveList.prototype.adjust = function() {
        var _this = this;
        var index = 0;
        $(this.listElement).children().each(function() {
            index++;

            _this.applyMargin(this, index);

            if(index == _this.rowNodes) {
                index = 0;
            }
        });
    }

    responsiveList.prototype.responsive = function() {
        this.oldNodeCount = this.nodeCount;
        this.nodeCount = responsiveList.calcNodeCount(this.listElement);

        this.oldListSize = this.listSize;
        this.listSize = responsiveList.calcSize(this.listElement);

        this.oldNodeSize = this.nodeSize;
        this.nodeSize = responsiveList.calcSize(this.firstChild);

        this.settings = this.processSettings(this.rawSettings);


        if(this.listSize.width != this.oldListSize.width || this.nodeSize != this.oldNodeSize.width || this.nodeCount != this.oldNodeCount) {
            this.oldRowNodes = this.rowNodes;
            this.rowNodes = this.getRowNodes();
            console.log('new row nodes: '+this.rowNodes);
        }

        if(this.listSize.width != this.oldListSize.width || this.nodeSize != this.oldNodeSize.width || this.rowNodes != this.rowNodes) {
            this.oldEmptySpace = this.emptySpace;
            this.emptySpace = this.getEmptySpace();
            console.log('new empty space: '+this.emptySpace);
        }

        if(this.emptySpace != this.oldEmptySpace || this.rowNodes != this.oldRowNodes) {
            this.oldMargin = this.margin;
            this.margin = this.getMargin();
            console.log('new margin: '+this.margin);
        }

        if(this.margin != this.oldMargin) {
            console.log('adjusting...');
            this.adjust();
        }
    }

    var PLUGIN_IDENTIFIER = 'responsiveList';

    var methods = {
        init : function(options) {
            var _this = this;
            var settings = $.extend({
                minimumMargin: '25px',
                maximumMargin: 0,

                minimumWidth: 200,
                maximumWidth: 400,

                minimumHeight: 0,
                maximumHeight: 0,

                responsiveMargin: false,
                responsiveScale: true,
                preferScale: false,
                preferMargin: false,

                fillEmptyChildren: true,
                scalePoroptional: true,
                precise: false
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