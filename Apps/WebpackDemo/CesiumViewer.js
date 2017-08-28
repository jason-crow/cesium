'use strict';

//window.CESIUM_BASE_URL = './';

window.onload = function(){

    /*
     * 'debug'  : true/false,   // Full WebGL error reporting at substantial performance cost.
     * 'lookAt' : CZML id,      // The CZML ID of the object to track at startup.
     * 'source' : 'file.czml',  // The relative URL of the CZML file to load at startup.
     * 'stats'  : true,         // Enable the FPS performance display.
     * 'theme'  : 'lighter',    // Use the dark-text-on-light-background theme.
     * 'scene3DOnly' : false    // Enable 3D only mode
     * 'view' : longitude,latitude,[height,heading,pitch,roll]
     *    // Using degrees and meters
     *    // [height,heading,pitch,roll] default is looking straight down, [300,0,-90,0]
     */
    var endUserOptions = Cesium.queryToObject(window.location.search.substring(1));

    var imageryProvider;
    if (endUserOptions.tmsImageryUrl) {
        imageryProvider = Cesium.createTileMapServiceImageryProvider({
            url : endUserOptions.tmsImageryUrl
        });
    }

    var loadingIndicator = document.getElementById('loadingIndicator');
    var viewer;
    try {
        viewer = new Cesium.Viewer('cesiumContainer', {
            imageryProvider : imageryProvider,
            baseLayerPicker : !Cesium.defined(imageryProvider),
            scene3DOnly : endUserOptions.scene3DOnly
        });
    } catch (exception) {
        loadingIndicator.style.display = 'none';
        var message = Cesium.formatError(exception);
        console.error(message);
        if (!document.querySelector('.cesium-widget-errorPanel')) {
            window.alert(message); //eslint-disable-line no-alert
        }
        return;
    }

    viewer.extend(Cesium.viewerDragDropMixin);
    if (endUserOptions.inspector) {
        viewer.extend(viewerCesiumInspectorMixin);
    }

    var showLoadError = function(name, error) {
        var title = 'An error occurred while loading the file: ' + name;
        var message = 'An error occurred while loading the file, which may indicate that it is invalid.  A detailed error report is below:';
        viewer.cesiumWidget.showErrorPanel(title, message, error);
    };

    viewer.dropError.addEventListener(function(viewerArg, name, error) {
        showLoadError(name, error);
    });

    var scene = viewer.scene;
    var context = scene.context;
    if (endUserOptions.debug) {
        context.validateShaderProgram = true;
        context.validateFramebuffer = true;
        context.logShaderCompilation = true;
        context.throwOnWebGLError = true;
    }

    var view = endUserOptions.view;
    var source = endUserOptions.source;
    if (Cesium.defined(source)) {
        var loadPromise;

        if (/\.czml$/i.test(source)) {
            loadPromise = CzmlDataSource.load(source);
        } else if (/\.geojson$/i.test(source) || /\.json$/i.test(source) || /\.topojson$/i.test(source)) {
            loadPromise = GeoJsonDataSource.load(source);
        } else if (/\.kml$/i.test(source) || /\.kmz$/i.test(source)) {
            loadPromise = KmlDataSource.load(source, {
                camera: scene.camera,
                canvas: scene.canvas
            });
        } else {
            Cesium.showLoadError(source, 'Unknown format.');
        }

        if (Cesium.defined(loadPromise)) {
            viewer.dataSources.add(loadPromise).then(function(dataSource) {
                var lookAt = endUserOptions.lookAt;
                if (Cesium.defined(lookAt)) {
                    var entity = dataSource.entities.getById(lookAt);
                    if (Cesium.defined(entity)) {
                        viewer.trackedEntity = entity;
                    } else {
                        var error = 'No entity with id "' + lookAt + '" exists in the provided data source.';
                        Cesium.showLoadError(source, error);
                    }
                } else if (!Cesium.defined(view)) {
                    viewer.flyTo(dataSource);
                }
            }).otherwise(function(error) {
                Cesium.showLoadError(source, error);
            });
        }
    }

    if (endUserOptions.stats) {
        scene.debugShowFramesPerSecond = true;
    }

    var theme = endUserOptions.theme;
    if (Cesium.defined(theme)) {
        if (endUserOptions.theme === 'lighter') {
            document.body.classList.add('cesium-lighter');
            viewer.animation.applyThemeChanges();
        } else {
            var error = 'Unknown theme: ' + theme;
            viewer.cesiumWidget.showErrorPanel(error, '');
        }
    }

    if (Cesium.defined(view)) {
        var splitQuery = view.split(/[ ,]+/);
        if (splitQuery.length > 1) {
            var longitude = !isNaN(+splitQuery[0]) ? +splitQuery[0] : 0.0;
            var latitude = !isNaN(+splitQuery[1]) ? +splitQuery[1] : 0.0;
            var height = ((splitQuery.length > 2) && (!isNaN(+splitQuery[2]))) ? +splitQuery[2] : 300.0;
            var heading = ((splitQuery.length > 3) && (!isNaN(+splitQuery[3]))) ? Cesium.Math.toRadians(+splitQuery[3]) : undefined;
            var pitch = ((splitQuery.length > 4) && (!isNaN(+splitQuery[4]))) ? Cesium.Math.toRadians(+splitQuery[4]) : undefined;
            var roll = ((splitQuery.length > 5) && (!isNaN(+splitQuery[5]))) ? Cesium.Math.toRadians(+splitQuery[5]) : undefined;

            viewer.camera.setView({
                destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
                orientation: {
                    heading: heading,
                    pitch: pitch,
                    roll: roll
                }
            });
        }
    }

    var camera = viewer.camera;
    function saveCamera() {
        var position = camera.positionCartographic;
        var hpr = '';
        if (Cesium.defined(camera.heading)) {
            hpr = ',' + Cesium.Math.toDegrees(camera.heading) + ',' + Cesium.Math.toDegrees(camera.pitch) + ',' + Cesium.Math.toDegrees(camera.roll);
        }
        endUserOptions.view = Cesium.Math.toDegrees(position.longitude) + ',' + Cesium.Math.toDegrees(position.latitude) + ',' + position.height + hpr;
        history.replaceState(undefined, '', '?' + Cesium.objectToQuery(endUserOptions));
    }

    var timeout;
    if (endUserOptions.saveCamera !== 'false') {
        camera.changed.addEventListener(function() {
            window.clearTimeout(timeout);
            timeout = window.setTimeout(saveCamera, 1000);
        });
    }

    loadingIndicator.style.display = 'none';
};
