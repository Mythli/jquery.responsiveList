(function ( $ ) {
    function cssSize(width, height) {
        this.width = 0;
        this.height = 0;

        if(width) { this.width = width; }
        if(height) { this.height = height; }
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

    function responsiveList(listElement, settings) {
        this.rawSettings = settings;
        this.listElement = listElement;
        this.listSize = new cssSize();

        var $firstChild = $(this.listElement).find('li');

        var listSize = calcSize(listElement);

        if(this.rawSettings.minMargin == -1) { this.rawSettings.minMargin = $firstChild.css('margin-right'); }
        if(this.rawSettings.minWidth == -1) { this.rawSettings.minWidth = $firstChild.css('width'); }
        if(this.rawSettings.minHeight == -1) { this.rawSettings.minHeight = $firstChild.css('height'); }
    }

    function parseCss(cssStr) {
        var expression = new RegExp('(-*\\d+)((?:px)|(?:%)|(?:em)|(?:){0})$');
        var matches = expression.exec(cssStr);
        if(matches) {
            matches.splice(0, 1);
            matches[0] = Number(matches[0]);
            return matches;
        }

        return false;
    }

    // TODO: percent values
    function calcPx(value, reference) {
        var nValue = value;
        var nReference = reference;

        if (Array.isArray(value)) { nValue = value[0]; }
        if (Array.isArray(reference)) { nReference = reference[0] }

        return nValue;
    }

    function calcSize(listElement) {
        return new cssSize($(listElement).innerWidth(), $(listElement).innerHeight());
    }

    function calcNodeCount(listElement) {
        return $(listElement).children().length;
    }

    function calcRowNodesGuess(listWidth, childWidth) {
        return Math.floor(listWidth / childWidth);
    }

    function calcRowNodes(rowNodesGuess, nodeCount) {
        if(rowNodesGuess > nodeCount) {
            return nodeCount;
        }
        return rowNodesGuess;
    }

    function calcEmptySpace(listWidth, nodeWidth, rowNodes) {
        var nodesSpace = rowNodes * nodeWidth;
        var restSpace = listWidth % nodesSpace;
        var emptySpace = listWidth - nodesSpace;

        if(emptySpace > restSpace) {
            return emptySpace;
        } else {
            return restSpace;
        }
    }

    function calcMargin(emptySpace, rowNodes) {
        var margin = emptySpace;
        if(rowNodes > 1) {
            margin = emptySpace / (rowNodes - 1);
        }

        return margin;
    }

    function calcScaledSize(size, emptySpace, rowNodes, propotional) {
        var emptyNodeSpace = emptySpace / rowNodes;
        var scaledSize = new cssSize();
        scaledSize.width = size.width + emptyNodeSpace;

        if(propotional) {
            scaledSize.height = size.height * (scaledSize.width / size.width);
        }

        return scaledSize;
    }

    responsiveList.prototype.calcRowNodes = function() {
        var rowNodes = calcRowNodesGuess(this.listSize.width, this.settings.minWidth + this.settings.minMargin);

        if(rowNodes < this.settings.minRowNodes) {
            rowNodes = this.settings.minRowNodes;
        }

        if(rowNodes > this.settings.maxRowNodes) {
            rowNodes = this.settings.maxRowNodes;
        }

        if(this.settings.fillEmptyChildren) {
            rowNodes = calcRowNodes(rowNodes, this.nodeCount);
        }

        return rowNodes;
    }

    responsiveList.prototype.calcEmptySpace = function() {
        return calcEmptySpace(this.listSize.width, this.settings.minWidth, this.rowNodes);
    }

    responsiveList.prototype.calcScaledSize = function() {
        if(!this.settings.responsiveScale) {
            return new cssSize(this.settings.minWidth, this.settings.minHeight);
        }
        ;
        var scaledSize = calcScaledSize(new cssSize(this.settings.minWidth, this.settings.minHeight), this.emptySpace + this.margin, this.rowNodes, this.settings.scalePoroptional);
        scaledSize.width = (scaledSize.width - this.margin);

        if(!this.settings.precise) {
            scaledSize.floor();
        }

        if(scaledSize.width > this.settings.maxWidth && this.settings.maxWidth != -1) {
            scaledSize.width = this.settings.maxWidth;
            if(this.settings.scalePoroptional) {
                scaledSize.height = this.settings.maxHeight;
            }
        }

        if(scaledSize.height > this.settings.maxHeight && this.settings.maxHeight != -1) {
            scaledSize.height = this.settings.maxHeight;
            if(this.settings.scalePoroptional) {
                scaledSize.width = this.settings.width;
            }
        }
        return scaledSize;
    }

    responsiveList.prototype.calcMargin = function() {
        var margin = this.settings.minMargin;

        if(this.settings.responsiveMargin) {
            var scaledSpace = 0;
            if(!this.settings.preferMargin) {
                scaledSpace = (this.scaledSize.width - this.settings.minWidth) * this.rowNodes;
            }
            margin = calcMargin(this.emptySpace - scaledSpace, this.rowNodes);
            if(!this.settings.precise) {
                margin = Math.floor(margin);
            }

            if(margin < this.settings.minMargin) {
                margin = this.settings.minMargin;
            }

            if(margin > this.settings.maxMargin && this.settings.maxMargin != -1) {
                console.log(this.settings.maxMargin);
                margin = this.settings.maxMargin;
            }
        }
        return margin;
    }

    responsiveList.prototype.calcSettings = function() {
        var newSettings = $.extend(true, this.rawSettings, {
            minMargin: calcPx(parseCss(this.rawSettings.minMargin), this.listSize.width),
            maxMargin: calcPx(parseCss(this.rawSettings.maxMargin), this.listSize.width),

            minWidth: calcPx(parseCss(this.rawSettings.minWidth), this.listSize.width),
            maxWidth: calcPx(parseCss(this.rawSettings.maxWidth), this.listSize.width),

            minHeight: calcPx(parseCss(this.rawSettings.minHeight), this.listSize.width),
            maxHeight: calcPx(parseCss(this.rawSettings.maxHeight), this.listSize.width)
        });

        this.margin = newSettings.minMargin;
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
        this.nodeCount = calcNodeCount(this.listElement);
        if(this.nodeCount != this.oldNodeCount) {
            console.log('new node count: '+this.nodeCount);
        }

        this.oldListSize = this.listSize;
        this.listSize = calcSize(this.listElement);
        if(!this.listSize.compare(this.oldListSize)) {
            console.log('new list size: width: '+this.listSize.width+' height: '+this.listSize.height);
        }

        if(this.listSize.width != this.oldListSize.width) {
            this.settings = this.calcSettings();
        }

        if(this.listSize.width != this.oldListSize.width || this.nodeCount != this.oldNodeCount) {
            this.oldRowNodes = this.rowNodes;
            this.rowNodes = this.calcRowNodes();
            if(this.rowNodes != this.oldRowNodes) {
                console.log('new row nodes: '+this.rowNodes);
            }
        }

        if(this.rowNodes < 1) {
            return 0;
        }

        if(this.listSize.width != this.oldListSize.width || this.rowNodes != this.rowNodes) {
            this.oldEmptySpace = this.emptySpace;
            this.emptySpace = this.calcEmptySpace();
            if(this.emptySpace != this.oldEmptySpace) {
                console.log('new empty space: '+this.emptySpace);
            }
        }

        if(this.emptySpace != this.oldEmptySpace || this.rowNodes != this.oldRowNodes) {
            if(this.settings.preferMargin) {
                this.oldMargin = this.margin;
                this.margin = this.calcMargin();

                this.oldScaledSize = this.scaledSize;
                this.scaledSize = this.calcScaledSize();
            } else {
                this.oldScaledSize = this.scaledSize;
                this.scaledSize = this.calcScaledSize();

                this.oldMargin = this.margin;
                this.margin = this.calcMargin();
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
                minMargin: -1,
                maxMargin: -1,
                minWidth: -1,
                maxWidth: -1,
                minHeight: -1,
                maxHeight: -1,
                maxRowNodes: 4,
                minRowNodes: 1,
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