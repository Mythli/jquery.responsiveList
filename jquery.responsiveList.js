(function ( $ ) {
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
        return new CssSize($(listElement).innerWidth(), $(listElement).innerHeight());
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
        var scaledSize = new CssSize();
        scaledSize.width = size.width + emptyNodeSpace;

        if(propotional) {
            scaledSize.height = size.height * (scaledSize.width / size.width);
        }

        return scaledSize;
    }

    function CssSize(width, height) {
        this.width = 0;
        this.height = 0;

        if(width) { this.width = width; }
        if(height) { this.height = height; }
    }

    CssSize.prototype.compare = function(size) {
        if(size == undefined) {
            return false;
        }
        if(this.width == size.width && this.height == size.width) {
            return true;
        }
        return false;
    }

    CssSize.prototype.floor = function() {
        this.width = Math.floor(this.width);
        this.height = Math.floor(this.height);
    }

    function CacheSet(owner) {
        this.flush();
        this.owner = owner;
    }

    CacheSet.prototype.init = function(name, dependencies, functor) {
        this._cache[name] = new Array();
        this._cache[name][0] = dependencies;
        this._cache[name][1] = functor;
    }

    CacheSet.prototype.get = function(name) {
        return this._cache[name][2];
    }

    CacheSet.prototype.set = function(name, value) {
        var _this = this;

        if(this._cache[name][2] != value) {
            console.log('name: '+name+' value: '+value+' old: ' +this._cache[name][2]);
            if(value != this._cache[name][2]) {
                this._cache[name][2] = value;

                var keys = Object.keys(this._cache);
                $.each(keys, function() {
                    var item = _this._cache[this];
                    if(item[0]) {
                        if($.inArray(name, item[0]) > -1) {
                            var args = Array();
                            $.each(item[0], function() {
                                var arg = _this._cache[this][2];
                                if(arg) {
                                    args.push(arg);
                                }
                            });

                            if(item[1] && args.length == item[0].length) {
                                console.log('invoke: '+this+' due: '+name);
                                _this.set(String(this), item[1].apply(_this.owner, args));
                            }
                        }
                    }
                });
            }
        }
    }

    CacheSet.prototype.flush = function() {
        this._cache = new Array();
    }

    function ResponsiveList(listElement, settings) {
        this._rawSettings = settings;
        this._cache = new CacheSet(this);
        this._listElement = listElement;
        this._listSize = new CssSize();

        var $firstChild = $(this._listElement).find('li');
        if(this._rawSettings.minMargin == -1) { this._rawSettings.minMargin = $firstChild.css('margin-right'); }
        if(this._rawSettings.minWidth == -1) { this._rawSettings.minWidth = $firstChild.innerWidth(); }
        if(this._rawSettings.minHeight == -1) { this._rawSettings.minHeight = $firstChild.innerHeight(); }

        this._cache.init('listSize', null, null);
        this._cache.init('nodeCount', null, null);
        this._cache.init('settings', ['listSize'], this._calcSettings);
        this._cache.init('rowNodes', ['listSize', 'nodeCount', 'settings'], this._calcRowNodes);
        this._cache.init('emptySpace', ['listSize', 'rowNodes', 'settings'], this._calcEmptySpace);
        //if(settings.preferMargin) {
        //    this._cache.init('margin', ['emptySpace', 'rowNodes', 'settings'], this._calcMargin);
        //    this._cache.init('scaledSize', ['emptySpace', 'rowNodes', 'settings', 'margin'], this._calcScaledSize);
        //} else {
            this._cache.init('scaledSize', ['emptySpace', 'rowNodes', 'settings'], this._calcScaledSize);
            this._cache.init('margin', ['emptySpace', 'rowNodes', 'settings'], this._calcMargin);
        //}
        //alert(this._cache._cache['test'][0][0]);
    }

    ResponsiveList.prototype.getNodeCount = function() { return this._cache.get('nodeCount'); }
    ResponsiveList.prototype.getListSize = function() { return this._cache.get('listSize'); }

    ResponsiveList.prototype._calcRowNodes = function(listSize, nodeCount, settings) {
        var rowNodes = calcRowNodesGuess(listSize.width, settings.minWidth + settings.minMargin);

        if(rowNodes < settings.minRowNodes) {
            rowNodes = settings.minRowNodes;
        }

        if(rowNodes > settings.maxRowNodes) {
            rowNodes = settings.maxRowNodes;
        }

        if(settings.fillEmptyChildren) {
            rowNodes = calcRowNodes(rowNodes, nodeCount);
        }

        return rowNodes;
    }
    ResponsiveList.prototype.getRowNodes = function() { return this._cache.get('rowNodes'); }

    ResponsiveList.prototype._calcEmptySpace = function(listSize, rowNodes, settings) {
        return calcEmptySpace(listSize.width, settings.minWidth, rowNodes);
    }

    ResponsiveList.prototype.getEmptySpace = function() { return this._cache.get('emptySpace'); }

    ResponsiveList.prototype._calcScaledSize = function(emptySpace, rowNodes, settings) {
        if(!this.getSettings().responsiveScale) {
            return new CssSize(this.getSettings().minWidth, this.getSettings().minHeight);
        }
        ;
        var scaledSize = calcScaledSize(new CssSize(settings.minWidth, settings.minHeight), emptySpace + this.getMargin(), rowNodes, settings.scalePoroptional);
        scaledSize.width = (scaledSize.width - this.getMargin());

        if(!settings.precise) {
            scaledSize.floor();
        }

        if(scaledSize.width > settings.maxWidth && settings.maxWidth != -1) {
            scaledSize.width = settings.maxWidth;
            if(settings.scalePoroptional) {
                scaledSize.height = settings.maxHeight;
            } else {
                scaledSize.width = settings.minWidth;
            }
        }

        if(scaledSize.height > settings.maxHeight && settings.maxHeight != -1) {
            scaledSize.height = settings.maxHeight;
            if(settings.scalePoroptional) {
                scaledSize.width = settings.width;
            }
        }
        return scaledSize;
    }
    
    ResponsiveList.prototype.getScaledSize = function() {
        var scaledSize = this._cache.get('scaledSize');
        if(!scaledSize) {
            scaledSize = new CssSize();
        }
        return scaledSize;
    }

    ResponsiveList.prototype._calcMargin = function(emptySpace, rowNodes, settings) {
        var margin = settings.minMargin;

        console.log('space: '+emptySpace+' rowNodes: '+rowNodes);

        if(settings.responsiveMargin) {
            var scaledSpace = 0;
            if(!settings.preferMargin) {
                scaledSpace = (this.getScaledSize().width - settings.minWidth) * rowNodes;
            }
            margin = calcMargin(emptySpace - scaledSpace, rowNodes);
            if(!settings.precise) {
                margin = Math.floor(margin);
            }

            if(margin < settings.minMargin) {
                margin = settings.minMargin;
            }

            if(margin > settings.maxMargin && settings.maxMargin != -1) {
                console.log(settings.maxMargin);
                margin = settings.maxMargin;
            }
        }

        console.log('space: '+emptySpace+' rowNodes: '+rowNodes+' margin: '+margin);
        return margin;
    }

    ResponsiveList.prototype.getMargin = function() {
        var margin = this._cache.get('margin');
        if(!margin) {
            margin = 0;
        }
        return margin;
    }

    ResponsiveList.prototype._calcSettings = function(listSize) {
        var newSettings = $.extend(true, this._rawSettings, {
            minMargin: calcPx(parseCss(this._rawSettings.minMargin), listSize.width),
            maxMargin: calcPx(parseCss(this._rawSettings.maxMargin), listSize.width),

            minWidth: calcPx(parseCss(this._rawSettings.minWidth), listSize.width),
            maxWidth: calcPx(parseCss(this._rawSettings.maxWidth), listSize.width),

            minHeight: calcPx(parseCss(this._rawSettings.minHeight), listSize.width),
            maxHeight: calcPx(parseCss(this._rawSettings.maxHeight), listSize.width)
        });

        //this._cache.set('margin', newSettings.minMargin);
        return newSettings;
    }

    ResponsiveList.prototype.getSettings = function() {
        return this._cache.get('settings');
    }

    ResponsiveList.prototype.applyMargin = function(element, index) {
        var margin = this.getMargin();
        if(index == this.getRowNodes()) {
            margin = 0;
        }
        if(this.getRowNodes() == 1) {
            margin = this.getMargin();
        }

        $(element).css('margin-right', margin+'px');
    }

    ResponsiveList.prototype.applyScale = function(element) {
        $(element).css('width', this.getScaledSize().width);
        $(element).css('height', this.getScaledSize().height);
    }

    ResponsiveList.prototype.adjust = function() {
        var _this = this;
        var index = 0;
        $(this._listElement).children().each(function() {
            index++;

            var doAdjust = _this.getSettings().beforeAdjust(this, index, _this);
            if(doAdjust || doAdjust == undefined) {
                _this.applyMargin(this, index);
                _this.applyScale(this);
                _this.getSettings().afterAdjust(this, index, _this);
            }

            if(index == _this.getRowNodes()) {
                index = 0;
            }
        });
    }

    ResponsiveList.prototype.responsive = function() {
        this._cache.set('nodeCount', calcNodeCount(this._listElement));
        this._cache.set('listSize', calcSize(this._listElement));

        if(this.getRowNodes() < 1) {
            return 0;
        }

        //if(this.getMargin() != this.oldMargin || !this.getScaledSize().compare(this.oldScaledSize)) {
            console.log('adjusting...');
            this.adjust();
        //}
    }

    var PLUGIN_IDENTIFIER = 'ResponsiveList';

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
                var responsiveApi = new ResponsiveList(this, settings);
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