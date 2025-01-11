$(document).ready(function () {
    var map = L.map('map').setView([0, 0], 1);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    function convertE7(value) {
        return value / 10000000;
    }

    function visualizeDataOnMap(data) {
        var routesHash = {};

        function createRouteHash(startCoords, endCoords) {
            return startCoords.toString() + '_' + endCoords.toString();
        }

        data.timelineObjects.forEach(function (timelineObject) {
            if (!timelineObject.activitySegment) {
                return;
            }

            var segment = timelineObject.activitySegment;
            var startCoords = [convertE7(segment.startLocation.latitudeE7), convertE7(segment.startLocation.longitudeE7)];
            var endCoords = [convertE7(segment.endLocation.latitudeE7), convertE7(segment.endLocation.longitudeE7)];

            var routeHash = createRouteHash(startCoords, endCoords);

            if (routesHash[routeHash]) {
                return;
            }

            routesHash[routeHash] = true;

            var polylinePoints = [startCoords];

            if (segment.waypointPath && segment.waypointPath.waypoints) {
                segment.waypointPath.waypoints.forEach(function (waypoint) {
                    polylinePoints.push([convertE7(waypoint.latE7), convertE7(waypoint.lngE7)]);
                });
            }

            polylinePoints.push(endCoords);

            L.polyline(polylinePoints, {color: 'blue'}).addTo(map);

            L.marker(startCoords).addTo(map);
            L.marker(endCoords).addTo(map);
        });

        if (Object.keys(routesHash).length > 0) {
            var allRoutes = [];
            for (var route in routesHash) {
                var points = route.split('_').map(function (point) {
                    return point.split(',').map(function (coord) {
                        return parseFloat(coord);
                    });
                });
                allRoutes = allRoutes.concat(points);
            }
            var bounds = L.latLngBounds(allRoutes);
            map.fitBounds(bounds);
        }
    }

    function processFiles(files) {
        var readFilesPromises = Array.from(files).map(file => {
            if (file.name.endsWith('.json')) {
                return new Promise((resolve, reject) => {
                    var reader = new FileReader();
                    reader.onload = e => {
                        try {
                            var data = JSON.parse(e.target.result);
                            resolve(data); // Розв'язання проміса з даними
                        } catch (error) {
                            console.error("Error reading or parsing file", error);
                            reject(error); // Відхилення проміса у разі помилки
                        }
                    };
                    reader.onerror = error => {
                        console.error("Error reading file", error);
                        reject(error);
                    };
                    reader.readAsText(file);
                });
            }
        }).filter(promise => promise !== undefined);

        map.eachLayer(function (layer) {
            if (!!layer.toGeoJSON) {
                map.removeLayer(layer);
            }
        });

        Promise.all(readFilesPromises).then(allData => {
            allData.forEach(data => {
                visualizeDataOnMap(data);
            });
        }).catch(error => {
            console.error("Error processing files", error);
        });
    }

    $('#uploadForm').on('submit', function (e) {
        e.preventDefault();
        var files = $('#jsonInput').get(0).files;
        if (files.length > 0) {
            processFiles(files);
            var label = files.length === 1 ? files[0].name : files.length + " files";
            $('.custom-file-label').text(label);
        }
    });

    $('.custom-file-input').on('change', function (e) {
        var fileLabel = e.target.files.length === 1 ? e.target.files[0].name : e.target.files.length + " files";
        $(this).next('.custom-file-label').addClass("selected").html(fileLabel);
    });
});
