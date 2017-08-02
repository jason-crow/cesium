require('./Source/Widgets/widgets.css');
window.CESIUM_BASE_URL = './Source';

var Viewer = require('./Source/Widgets/Viewer/Viewer');

var viewer = new Viewer('cesiumContainer');
