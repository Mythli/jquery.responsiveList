(function ( $ ) {
    function cssParser(value) {
        this.expression = new RegExp('(-*\\d+)((?:px)|(?:%)|(?:em)|(?:){0})$');
        this.source = '0px';
        this.unit = 'px';
        this.numericValue = 0;

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

    cssSize.prototype.compare = function(size) {
        if(size == undefined) {
            return false;
        }

        if(this.width == size.width && this.height == size.width) {
            return true;
        }
        return false;
    }

    cssSize.prototype.floor = function() {
        this.width = Math.floor(this.width);
        this.height = Math.floor(this.height);
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

    responsiveList.calcMargin = function(emptySpace, rowNodes) {
        var margin = emptySpace;
        if(rowNodes > 1) {
            margin = emptySpace / (rowNodes - 1);
        }

        return margin;
    }

    responsiveList.calcScaledSize = function(size, emptySpace, rowNodes, propotional) {
        var emptyNodeSpace = emptySpace / rowNodes;
        console.log(emptySpace);
        var scaledSize = new cssSize();
        scaledSize.width = size.width + emptyNodeSpace;

        if(propotional) {
            scaledSize.height = size.height * (scaledSize.width / size.width);
        }

        return scaledSize;
    }

    responsiveList.prototype.getRowNodes = function() {
        var rowNodes = responsiveList.calcRowNodesGuess(this.listSize.width, this.settings.minimumWidth + this.settings.minimumMargin);

        if(rowNodes < this.settings.minimumRowNodes) {
            rowNodes = this.settings.minimumRowNodes;
        }

        if(rowNodes > this.settings.maximumRowNodes) {
            rowNodes = this.settings.maximumRowNodes;
        }

        if(this.settings.fillEmptyChildren) {
            rowNodes = responsiveList.calcRowNodes(rowNodes, this.nodeCount);
        }

        return rowNodes;
    }

    responsiveList.prototype.getEmptySpace = function() {
        return responsiveList.calcEmptySpace(this.listSize.width, this.settings.minimumWidth, this.rowNodes) - 1;
    }

    responsiveList.prototype.getMargin = function() {
        var margin = this.settings.minimumMargin;

        if(this.settings.responsiveMargin) {
            var scaledSpace = 0;
            if(!this.settings.preferMargin) {
                scaledSpace = (this.scaledSize.width - this.settings.minimumWidth) * this.rowNodes;
            }
            margin = responsiveList.calcMargin(this.emptySpace - scaledSpace, this.rowNodes);
            if(!this.settings.precise) {
                margin = Math.floor(margin);
            }

            if(margin < this.settings.minimumMargin) {
                margin = this.settings.minimumMargin;
            }

            if(margin > this.settings.maximumMargin && this.settings.maximumMargin != -1) {
                console.log(this.settings.maximumMargin);
                margin = this.settings.maximumMargin;
            }
        }
        return margin;
    }

    responsiveList.prototype.getScaledSize = function() {
        if(!this.settings.responsiveScale) {
            return new cssSize(this.settings.minimumWidth, this.settings.minimumHeight);
        }
;
        var scaledSize = responsiveList.calcScaledSize(new cssSize(this.settings.minimumWidth, this.settings.minimumHeight), this.emptySpace + this.margin, this.rowNodes, this.settings.scalePoroptional);
        scaledSize.width = (scaledSize.width - this.margin);

        if(!this.settings.precise) {
            scaledSize.floor();
        }

        if(scaledSize.width > this.settings.maximumWidth && this.settings.maximumWidth != -1) {
            scaledSize.width = this.settings.maximumWidth;

        }

        if(scaledSize.height > this.settings.maximumHeight && this.settings.maximumHeight != -1) {
            scaledSize.height = this.settings.maximumHeight;
        }

        //var scaledSpace = (scaledSize.width - this.settings.minimumWidth) * this.rowNodes;
        //console.log('scaled space: '+scaledSpace);
        //this.emptySpace = this.emptySpace - scaledSpace;
        return scaledSize;
    }

    responsiveList.prototype.processSettings = function(settings) {
        var newSettings = $.extend(true, settings, {
            minimumMargin: cssDistanceCalculator.calculatePixel(settings.minimumMargin, this.listSize.width),
            maximumMargin: cssDistanceCalculator.calculatePixel(settings.maximumMargin, this.listSize.width),

            minimumWidth: cssDistanceCalculator.calculatePixel(settings.minimumWidth, this.listSize.width),
            maximumWidth: cssDistanceCalculator.calculatePixel(settings.maximumWidth, this.listSize.width),

            minimumHeight: cssDistanceCalculator.calculatePixel(settings.minimumHeight, this.listSize.width),
            maximumHeight: cssDistanceCalculator.calculatePixel(settings.maximumHeight, this.listSize.width)
        });

        this.margin = newSettings.minimumMargin;

        return newSettings;
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

    responsiveList.prototype.applyScale = function(element) {
        $(element).css('width', this.scaledSize.width);
        $(element).css('height', this.scaledSize.height);
    }

    responsiveList.prototype.adjust = function() {
        var _this = this;
        var index = 0;
        $(this.listElement).children().each(function() {
            index++;

            var doAdjust = _this.settings.beforeAdjust(this, index, _this);
            if(doAdjust || doAdjust == undefined) {
                _this.applyMargin(this, index);
                _this.applyScale(this);
                _this.settings.afterAdjust(this, index, _this);
            }

            if(index == _this.rowNodes) {
                index = 0;
            }
        });
    }

    responsiveList.prototype.responsive = function() {
        this.oldNodeCount = this.nodeCount;
        this.nodeCount = responsiveList.calcNodeCount(this.listElement);
        if(this.nodeCount != this.oldNodeCount) {
            console.log('new node count: '+this.nodeCount);
        }

        this.oldListSize = this.listSize;
        this.listSize = responsiveList.calcSize(this.listElement);
        if(!this.listSize.compare(this.oldListSize)) {
            console.log('new list size: width: '+this.listSize.width+' height: '+this.listSize.height);
        }

        if(this.listSize.width != this.oldListSize.width) {
            this.settings = this.processSettings(this.rawSettings);
        }

        if(this.listSize.width != this.oldListSize.width || this.nodeCount != this.oldNodeCount) {
            this.oldRowNodes = this.rowNodes;
            this.rowNodes = this.getRowNodes();
            console.log('new row nodes: '+this.rowNodes);
        }

        //if(this.listSize.width != this.oldListSize.width || this.rowNodes != this.rowNodes) {
            this.oldEmptySpace = this.emptySpace;
            this.emptySpace = this.getEmptySpace();
            if(this.emptySpace != this.oldEmptySpace) {
                console.log('new empty space: '+this.emptySpace);
            }
        //}

        if(this.emptySpace != this.oldEmptySpace || this.rowNodes != this.oldRowNodes) {
            if(this.settings.preferMargin) {
                this.oldMargin = this.margin;
                this.margin = this.getMargin();

                this.oldScaledSize = this.scaledSize;
                this.scaledSize = this.getScaledSize();
            } else {
                this.oldScaledSize = this.scaledSize;
                this.scaledSize = this.getScaledSize();

                this.oldMargin = this.margin;
                this.margin = this.getMargin();
            }

            if(this.margin != this.oldMargin) {
                console.log('new margin: '+this.margin);
            }


            if(!this.scaledSize.compare(this.oldScaledSize)) {
                console.log('new scale: width: '+this.scaledSize.width+' height: '+this.scaledSize.height);
            }
        }

        if(this.margin != this.oldMargin || !this.scaledSize.compare(this.oldScaledSize)) {
            console.log('adjusting...');
            this.adjust();
        }
    }

    var PLUGIN_IDENTIFIER = 'responsiveList';

    var methods = {
        init : function(options) {
            var _this = this;
            var settings = $.extend({
                minimumMargin: -1,
                maximumMargin: -1,

                minimumWidth: -1,
                maximumWidth: -1,

                minimumHeight: -1,
                maximumHeight: -1,

                maximumRowNodes: 4,
                minimumRowNodes: 1,

                responsiveMargin: false,
                responsiveScale: true,
                preferMargin: false,

                fillEmptyChildren: true,
                scalePoroptional: true,
                precise: false,
                beforeAdjust : function(element, index, api) { },
                afterAdjust : function(element, index, api) { }
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