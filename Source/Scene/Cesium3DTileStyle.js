define([
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/loadJson',
        '../Core/RequestScheduler',
        '../ThirdParty/when',
        './ConditionsExpression',
        './Expression'
    ], function(
        clone,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        loadJson,
        RequestScheduler,
        when,
        ConditionsExpression,
        Expression) {
    'use strict';

    /**
     * A style that is applied to a {@link Cesium3DTileset}.
     * <p>
     * Evaluates an expression defined using the
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}.
     * </p>
     *
     * @alias Cesium3DTileStyle
     * @constructor
     *
     * @param {String|Object} [style] The url of a style or an object defining a style.
     *
     * @example
     * tileset.style = new Cesium.Cesium3DTileStyle({
     *     color : {
     *         conditions : [
     *             ['${Height} >= 100', 'color("purple", 0.5)'],
     *             ['${Height} >= 50', 'color("red")'],
     *             ['true', 'color("blue")']
     *         ]
     *     },
     *     show : '${Height} > 0',
     *     meta : {
     *         description : '"Building id ${id} has height ${Height}."'
     *     }
     * });
     *
     * @example
     * tileset.style = new Cesium.Cesium3DTileStyle({
     *     color : 'vec4(${Temperature})',
     *     pointSize : '${Temperature} * 2.0'
     * });
     *
     * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
     */
    function Cesium3DTileStyle(style) {
        this._style = undefined;
        this._ready = false;

        this._show = undefined;
        this._color = undefined;
        this._pointColor = undefined;
        this._pointSize = undefined;
        this._pointOutlineColor = undefined;
        this._pointOutlineWidth = undefined;
        this._labelColor = undefined;
        this._labelOutlineColor = undefined;
        this._labelOutlineWidth = undefined;
        this._font = undefined;
        this._labelStyle = undefined;
        this._labelText = undefined;
        this._backgroundColor = undefined;
        this._backgroundPadding = undefined;
        this._backgroundEnabled = undefined;
        this._scaleByDistance = undefined;
        this._translucencyByDistance = undefined;
        this._distanceDisplayCondition = undefined;
        this._heightOffset = undefined;
        this._anchorLineEnabled = undefined;
        this._anchorLineColor = undefined;
        this._image = undefined;
        this._disableDepthTestDistance = undefined;
        this._origin = undefined;
        this._labelOrigin = undefined;
        this._meta = undefined;

        this._colorShaderFunction = undefined;
        this._showShaderFunction = undefined;
        this._pointSizeShaderFunction = undefined;
        this._colorShaderFunctionReady = false;
        this._showShaderFunctionReady = false;
        this._pointSizeShaderFunctionReady = false;

        var promise;
        if (typeof style === 'string') {
            promise = loadJson(style);
        } else {
            promise = when.resolve(style);
        }

        var that = this;
        this._readyPromise = promise.then(function(styleJson) {
            setup(that, styleJson);
            return that;
        });
    }

    function setup(that, styleJson) {
        that._style = clone(styleJson, true);

        styleJson = defaultValue(styleJson, defaultValue.EMPTY_OBJECT);

        that.show = styleJson.show;
        that.color = styleJson.color;
        that.pointSize = styleJson.pointSize;
        that.pointColor = styleJson.pointColor;
        that.pointOutlineColor = styleJson.pointOutlineColor;
        that.pointOutlineWidth = styleJson.pointOutlineWidth;
        that.labelColor = styleJson.labelColor;
        that.labelOutlineColor = styleJson.labelOutlineColor;
        that.labelOutlineWidth = styleJson.labelOutlineWidth;
        that.labelStyle = styleJson.labelStyle;
        that.font = styleJson.font;
        that.labelText = styleJson.labelText;
        that.backgroundColor = styleJson.backgroundColor;
        that.backgroundPadding = styleJson.backgroundPadding;
        that.backgroundEnabled = styleJson.backgroundEnabled;
        that.scaleByDistance = styleJson.scaleByDistance;
        that.translucencyByDistance = styleJson.translucencyByDistance;
        that.distanceDisplayCondition = styleJson.distanceDisplayCondition;
        that.heightOffset = styleJson.heightOffset;
        that.anchorLineEnabled = styleJson.anchorLineEnabled;
        that.anchorLineColor = styleJson.anchorLineColor;
        that.image = styleJson.image;
        that.disableDepthTestDistance = styleJson.disableDepthTestDistance;
        that.origin = styleJson.origin;
        that.labelOrigin = styleJson.labelOrigin;

        var meta = {};
        if (defined(styleJson.meta)) {
            var defines = styleJson.defines;
            var metaJson = defaultValue(styleJson.meta, defaultValue.EMPTY_OBJECT);
            for (var property in metaJson) {
                if (metaJson.hasOwnProperty(property)) {
                    meta[property] = new Expression(metaJson[property], defines);
                }
            }
        }

        that._meta = meta;

        that._ready = true;
    }

    function getExpression(tileStyle, value) {
        var defines = defaultValue(tileStyle._style, defaultValue.EMPTY_OBJECT).defines;
        if (!defined(value)) {
            return undefined;
        } else if (typeof value === 'boolean' || typeof value === 'number') {
            return new Expression(String(value));
        } else if (typeof value === 'string') {
            return new Expression(value, defines);
        } else if (defined(value.conditions)) {
            return new ConditionsExpression(value, defines);
        }
        return value;
    }

    defineProperties(Cesium3DTileStyle.prototype, {
        /**
         * Gets the object defining the style using the
         * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}.
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {Object}
         * @readonly
         *
         * @default undefined
         *
         * @exception {DeveloperError} The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.
         */
        style : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._style;
            }
        },

        /**
         * When <code>true</code>, the style is ready and its expressions can be evaluated.  When
         * a style is constructed with an object, as opposed to a url, this is <code>true</code> immediately.
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         */
        ready : {
            get : function() {
                return this._ready;
            }
        },

        /**
         * Gets the promise that will be resolved when the the style is ready and its expressions can be evaluated.
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {Promise.<Cesium3DTileStyle>}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise;
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>show</code> property. Alternatively a boolean, string, or object defining a show style can be used.
         * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
         * <p>
         * The expression must return or convert to a <code>Boolean</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         *
         * @example
         * var style = new Cesium3DTileStyle({
         *     show : '(regExp("^Chest").test(${County})) && (${YearBuilt} >= 1970)'
         * });
         * style.show.evaluate(frameState, feature); // returns true or false depending on the feature's properties
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override show expression with a custom function
         * style.show = {
         *     evaluate : function(frameState, feature) {
         *         return true;
         *     }
         * };
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override show expression with a boolean
         * style.show = true;
         * };
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override show expression with a string
         * style.show = '${Height} > 0';
         * };
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override show expression with a condition
         * style.show = {
         *     conditions: [
         *         ['${height} > 2', 'false'],
         *         ['true', 'true']
         *     ];
         * };
         */
        show : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._show;
            },
            set : function(value) {
                this._show = getExpression(this, value);
                this._showShaderFunctionReady = false;
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>color</code> property. Alternatively a string or object defining a color style can be used.
         * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
         * <p>
         * The expression must return a <code>Color</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         *
         * @example
         * var style = new Cesium3DTileStyle({
         *     color : '(${Temperature} > 90) ? color("red") : color("white")'
         * });
         * style.color.evaluateColor(frameState, feature, result); // returns a Cesium.Color object
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override color expression with a custom function
         * style.color = {
         *     evaluateColor : function(frameState, feature, result) {
         *         return Cesium.Color.clone(Cesium.Color.WHITE, result);
         *     }
         * };
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override color expression with a string
         * style.color = 'color("blue")';
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override color expression with a condition
         * style.color = {
         *     conditions : [
         *         ['${height} > 2', 'color("cyan")'],
         *         ['true', 'color("blue")']
         *     ]
         * };
         */
        color : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._color;
            },
            set : function(value) {
                this._color = getExpression(this, value);
                this._colorShaderFunctionReady = false;
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>pointColor</code> property.
         * <p>
         * The expression must return a <code>Color</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         */
        pointColor : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._pointColor;
            },
            set : function(value) {
                this._pointColor = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>pointSize</code> property.
         * <p>
         * The expression must return or convert to a <code>Number</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         *
         * @example
         * var style = new Cesium3DTileStyle({
         *     pointSize : '(${Temperature} > 90) ? 2.0 : 1.0'
         * });
         * style.pointSize.evaluate(frameState, feature); // returns a Number
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override pointSize expression with a custom function
         * style.pointSize = {
         *     evaluate : function(frameState, feature) {
         *         return 1.0;
         *     }
         * };
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override pointSize expression with a number
         * style.pointSize = 1.0;
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override pointSize expression with a string
         * style.pointSize = '${height} / 10';
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override pointSize expression with a condition
         * style.pointSize =  {
         *     conditions : [
         *         ['${height} > 2', '1.0'],
         *         ['true', '2.0']
         *     ]
         * };
         */
        pointSize : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._pointSize;
            },
            set : function(value) {
                this._pointSize = getExpression(this, value);
                this._pointSizeShaderFunctionReady = false;
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>pointOutlineColor</code> property.
         * <p>
         * The expression must return a <code>Color</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         */
        pointOutlineColor : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._pointOutlineColor;
            },
            set : function(value) {
                this._pointOutlineColor = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>pointOutlineWidth</code> property.
         * <p>
         * The expression must return a <code>Number</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         */
        pointOutlineWidth : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._pointOutlineWidth;
            },
            set : function(value) {
                this._pointOutlineWidth = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>labelColor</code> property.
         * <p>
         * The expression must return a <code>Color</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         */
        labelColor : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._labelColor;
            },
            set : function(value) {
                this._labelColor = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>labelOutlineColor</code> property.
         * <p>
         * The expression must return a <code>Color</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         */
        labelOutlineColor : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._labelOutlineColor;
            },
            set : function(value) {
                this._labelOutlineColor = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>labelOutlineWidth</code> property.
         * <p>
         * The expression must return a <code>Number</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         */
        labelOutlineWidth : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._labelOutlineWidth;
            },
            set : function(value) {
                this._labelOutlineWidth = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>font</code> property.
         * <p>
         * The expression must return a <code>String</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         *
         * @example
         * var style = new Cesium3DTileStyle({
         *     font : '(${Temperature} > 90) ? "30px Helvetica" : "24px Helvetica"'
         * });
         * style.font.evaluate(frameState, feature); // returns a String
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override font expression with a custom function
         * style.font = {
         *     evaluate : function(frameState, feature) {
         *         return '24px Helvetica';
         *     }
         * };
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
         */
        font : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._font;
            },
            set : function(value) {
                this._font = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>labelStyle</code> property.
         * <p>
         * The expression must return or convert to a <code>LabelStyle</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         *
         * @example
         * var style = new Cesium3DTileStyle({
         *     labelStyle : '(${Temperature} > 90) ? ' + LabelStyle.FILL_AND_OUTLINE + ' : ' + LabelStyle.FILL
         * });
         * style.labelStyle.evaluate(frameState, feature); // returns a Cesium.LabelStyle
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override labelStyle expression with a custom function
         * style.labelStyle = {
         *     evaluate : function(frameState, feature) {
         *         return LabelStyle.FILL;
         *     }
         * };
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
         */
        labelStyle : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._labelStyle;
            },
            set : function(value) {
                this._labelStyle = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>labelText</code> property.
         * <p>
         * The expression must return a <code>String</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         *
         * @example
         * var style = new Cesium3DTileStyle({
         *     text : '(${Temperature} > 90) ? ">90" : "<=90"'
         * });
         * style.text.evaluate(frameState, feature); // returns a String
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override text expression with a custom function
         * style.text = {
         *     evaluate : function(frameState, feature) {
         *         return 'Example label text';
         *     }
         * };
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
         */
        labelText : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._labelText;
            },
            set : function(value) {
                this._labelText = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>backgroundColor</code> property.
         * <p>
         * The expression must return a <code>Color</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         */
        backgroundColor : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._backgroundColor;
            },
            set : function(value) {
                this._backgroundColor = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>backgroundPadding</code> property.
         * <p>
         * The expression must return a <code>Cartesian2</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         */
        backgroundPadding : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._backgroundPadding;
            },
            set : function(value) {
                this._backgroundPadding = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>backgroundEnabled</code> property.
         * <p>
         * The expression must return a <code>Boolean</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         */
        backgroundEnabled : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._backgroundEnabled;
            },
            set : function(value) {
                this._backgroundEnabled = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>scaleByDistance</code> property.
         * <p>
         * The expression must return a <code>Cartesian4</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         */
        scaleByDistance : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._scaleByDistance;
            },
            set : function(value) {
                this._scaleByDistance = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>translucencyByDistance</code> property.
         * <p>
         * The expression must return a <code>Cartesian4</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         */
        translucencyByDistance : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._translucencyByDistance;
            },
            set : function(value) {
                this._translucencyByDistance = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>distanceDisplayCondition</code> property.
         * <p>
         * The expression must return a <code>Cartesian2</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         */
        distanceDisplayCondition : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._distanceDisplayCondition;
            },
            set : function(value) {
                this._distanceDisplayCondition = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>heightOffset</code> property.
         * <p>
         * The expression must return a <code>Number</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         */
        heightOffset : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._heightOffset;
            },
            set : function(value) {
                this._heightOffset = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>anchorLineEnabled</code> property.
         * <p>
         * The expression must return a <code>Boolean</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         */
        anchorLineEnabled : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._anchorLineEnabled;
            },
            set : function(value) {
                this._anchorLineEnabled = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>anchorLineColor</code> property.
         * <p>
         * The expression must return a <code>Color</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         */
        anchorLineColor : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._anchorLineColor;
            },
            set : function(value) {
                this._anchorLineColor = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>image</code> property.
         * <p>
         * The expression must return a <code>String</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         *
         * @example
         * var style = new Cesium3DTileStyle({
         *     image : '(${Temperature} > 90) ? "/url/to/image1" : "/url/to/image2"'
         * });
         * style.image.evaluate(frameState, feature); // returns a String
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override image expression with a custom function
         * style.image = {
         *     evaluate : function(frameState, feature) {
         *         return '/url/to/image';
         *     }
         * };
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
         */
        image : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._image;
            },
            set : function(value) {
                this._image = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>disableDepthTestDistance</code> property.
         * <p>
         * The expression must return a <code>Number</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         */
        disableDepthTestDistance : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._disableDepthTestDistance;
            },
            set : function(value) {
                this._disableDepthTestDistance = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>origin</code> property.
         * <p>
         * The expression must return or convert to a <code>HorizontalOrigin</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         *
         * @example
         * var style = new Cesium3DTileStyle({
         *     origin : HorizontalOrigin.LEFT
         * });
         * style.origin.evaluate(frameState, feature); // returns a Cesium.HorizontalOrigin
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override labelStyle expression with a custom function
         * style.origin = {
         *     evaluate : function(frameState, feature) {
         *         return HorizontalOrigin.CENTER;
         *     }
         * };
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
         */
        origin : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._origin;
            },
            set : function(value) {
                this._origin = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>labelOrigin</code> property.
         * <p>
         * The expression must return or convert to a <code>HorizontalOrigin</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         *
         * @example
         * var style = new Cesium3DTileStyle({
         *     labelOrigin : HorizontalOrigin.LEFT
         * });
         * style.labelOrigin.evaluate(frameState, feature); // returns a Cesium.HorizontalOrigin
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override labelStyle expression with a custom function
         * style.labelOrigin = {
         *     evaluate : function(frameState, feature) {
         *         return HorizontalOrigin.CENTER;
         *     }
         * };
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
         */
        labelOrigin : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._labelOrigin;
            },
            set : function(value) {
                this._labelOrigin = getExpression(this, value);
            }
        },

        /**
         * Gets or sets the object containing application-specific expression that can be explicitly
         * evaluated, e.g., for display in a UI.
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         *
         * @example
         * var style = new Cesium3DTileStyle({
         *     meta : {
         *         description : '"Building id ${id} has height ${Height}."'
         *     }
         * });
         * style.meta.description.evaluate(frameState, feature); // returns a String with the substituted variables
         */
        meta : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._meta;
            },
            set : function(value) {
                this._meta = value;
            }
        }
    });

    /**
     * Gets the color shader function for this style.
     *
     * @param {String} functionName Name to give to the generated function.
     * @param {String} attributePrefix Prefix that is added to any variable names to access vertex attributes.
     * @param {Object} shaderState Stores information about the generated shader function, including whether it is translucent.
     *
     * @returns {String} The shader function.
     *
     * @private
     */
    Cesium3DTileStyle.prototype.getColorShaderFunction = function(functionName, attributePrefix, shaderState) {
        if (this._colorShaderFunctionReady) {
            // Return the cached result, may be undefined
            return this._colorShaderFunction;
        }

        this._colorShaderFunctionReady = true;
        this._colorShaderFunction = defined(this.color) ? this.color.getShaderFunction(functionName, attributePrefix, shaderState, 'vec4') : undefined;
        return this._colorShaderFunction;
    };

    /**
     * Gets the show shader function for this style.
     *
     * @param {String} functionName Name to give to the generated function.
     * @param {String} attributePrefix Prefix that is added to any variable names to access vertex attributes.
     * @param {Object} shaderState Stores information about the generated shader function, including whether it is translucent.
     *
     * @returns {String} The shader function.
     *
     * @private
     */
    Cesium3DTileStyle.prototype.getShowShaderFunction = function(functionName, attributePrefix, shaderState) {
        if (this._showShaderFunctionReady) {
            // Return the cached result, may be undefined
            return this._showShaderFunction;
        }

        this._showShaderFunctionReady = true;
        this._showShaderFunction = defined(this.show) ? this.show.getShaderFunction(functionName, attributePrefix, shaderState, 'bool') : undefined;
        return this._showShaderFunction;
    };

    /**
     * Gets the pointSize shader function for this style.
     *
     * @param {String} functionName Name to give to the generated function.
     * @param {String} attributePrefix Prefix that is added to any variable names to access vertex attributes.
     * @param {Object} shaderState Stores information about the generated shader function, including whether it is translucent.
     *
     * @returns {String} The shader function.
     *
     * @private
     */
    Cesium3DTileStyle.prototype.getPointSizeShaderFunction = function(functionName, attributePrefix, shaderState) {
        if (this._pointSizeShaderFunctionReady) {
            // Return the cached result, may be undefined
            return this._pointSizeShaderFunction;
        }

        this._pointSizeShaderFunctionReady = true;
        this._pointSizeShaderFunction = defined(this.pointSize) ? this.pointSize.getShaderFunction(functionName, attributePrefix, shaderState, 'float') : undefined;
        return this._pointSizeShaderFunction;
    };

    return Cesium3DTileStyle;
});
