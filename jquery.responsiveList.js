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
        this.listElement = listElement;
        this.firstChild = $(listElement).find('li');
        this.processSettings(settings);


        console.log('new list size: '+this.getListSize().width+' height: '+this.getListSize().height);
        console.log('new node size: '+this.getNodeSize().width+' height: '+this.getNodeSize().height);
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


    // getters

    responsiveList.prototype.getListSize = function() {
        this.oldListSize = this.listSize;
        this.listSize = responsiveList.calcSize(this.listElement);
        return this.listSize;
    }

    responsiveList.prototype.getNodeCount = function() {
        this.oldNodeCount = this.nodeCount;
        this.nodeCount = responsiveList.calcNodeCount(this.listElement);
        return this.nodeCount;
    }

    responsiveList.prototype.getNodeSize = function() {
        this.oldNodeSize = this.nodeSize;
        this.nodeSize = responsiveList.calcSize(this.firstChild);
        return this.nodeSize;
    }

    responsiveList.prototype.getRowNodes = function() {
        this.oldRowNodes = this.rowNodes;
        if(!this.settings.cache || this.rowNodes == undefined || this.getListSize().width != this.oldListSize.width || this.getNodeSize().width != this.oldNodeSize.width || this.getNodeCount() != this.oldNodeCount) {
            this.rowNodes = responsiveList.calcRowNodesGuess(this.getListSize().width, this.getNodeSize().width + this.settings.minimumMargin);

            if(this.settings.fillEmptyChildren) {
                this.rowNodes = responsiveList.calcRowNodes(this.rowNodes, this.getNodeCount());
            }

            console.log('new row nodes: '+this.rowNodes);
        }

        return this.rowNodes;
    }

    responsiveList.prototype.getEmptySpace = function() {
        this.oldEmptySpace = this.emptySpace;
        if(!this.settings.cache || this.emptySpace == undefined || this.getRowNodes() != this.oldRowNodes || this.getListSize().width != this.oldListSize.width || this.getNodeSize().width != this.oldNodeSize.width) {
            this.emptySpace = responsiveList.calcEmptySpace(this.getListSize().width, this.getNodeSize().width, this.getRowNodes());

            console.log('new empty space: '+this.emptySpace);
        }

        return this.emptySpace;
    }

    responsiveList.prototype.getAdditionalSpace = function() {
        this.oldAdditionalSpace = this.additionalSpace;
        if(!this.settings.cache || this.margin == undefined || this.getEmptySpace() != this.oldEmptySpace || this.getRowNodes()  != this.oldRowNodes) {
            this.additionalSpace = responsiveList.calcAdditionalSpace(this.getEmptySpace(), this.getRowNodes());

            console.log('new additional space: '+this.additionalSpace);
        }

        return this.additionalSpace;
    }

    responsiveList.prototype.getMargin = function(index) {
        if(index != undefined) {
            if((index) == this.getRowNodes() - 1) {
                return 0;
            }
        }

        this.oldMargin = this.margin;
        if(!this.settings.cache || this.margin == undefined || this.getEmptySpace() != this.oldEmptySpace || this.getRowNodes() != this.oldRowNodes) {
            this.margin = responsiveList.calcMargin(this.getEmptySpace(), this.getRowNodes());

             if(this.margin < this.settings.minimumMargin) {
                this.margin = this.settings.minimumMargin;

            }

            if(this.margin > this.settings.maximumMargin && this.settings.maximumMargin != 0) {
                this.margin = this.settings.maximumMargin;
            }

            console.log('new margin: '+this.margin);
        }
        return this.margin;
    }

    responsiveList.prototype.processSettings = function(settings) {
        this.settings = $.extend(true, settings, {
            minimumMargin: cssDistanceCalculator.calculatePixel(settings.minimumMargin, this.getListSize()),
            maximumMargin: cssDistanceCalculator.calculatePixel(settings.maximumMargin, this.getListSize()),

            minimumWidth: cssDistanceCalculator.calculatePixel(settings.minimumWidth, this.getListSize()),
            minimumWidth: cssDistanceCalculator.calculatePixel(settings.maximumWidth, this.getListSize()),

            minimumWidth: cssDistanceCalculator.calculatePixel(settings.minimumHeight, this.getListSize()),
            minimumWidth: cssDistanceCalculator.calculatePixel(settings.maximumHeight, this.getListSize())
        });
    }

    responsiveList.prototype.applyMargin = function(element, index) {
        $(element).css('margin-right', this.getMargin(index)+'px');
    }

    responsiveList.prototype.adjust = function() {
        var _this = this;
        var index = 0;
        $(this.listElement).children().each(function() {
            _this.applyMargin(this, index);

            if(index - 1 == _this.getRowNodes()) {
                counter = 0;
            }
            index++;
        });
    }

    responsiveList.prototype.responsive = function() {

        this.adjust();
    }

    var PLUGIN_IDENTIFIER = 'responsiveList';

    var methods = {
        init : function(options) {
            var _this = this;
            var settings = $.extend({
                minimumMargin: '10px',
                maximumMargin: 0,

                minimumWidth: 200,
                maximumWidth: 400,

                minimumHeight: 0,
                maximumHeight: 0,

                responsiveMargin: true,
                responsiveScale: false,
                preferScale: false,
                preferMargin: false,

                fillEmptyChildren: true,
                scalePoroptional: true,
                cache: true
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