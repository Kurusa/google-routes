$(document).ready(function () {
    var map = L.map('map').setView([0, 0], 1);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var markers = L.markerClusterGroup();
    map.addLayer(markers);

    function convertE7(value) {
        return value / 10000000;
    }

    function visualizeDataOnMapChunk(chunk) {
        chunk.forEach(function (timelineObject) {
            if (!timelineObject.activitySegment) return;

            var segment = timelineObject.activitySegment;
            var startCoords = [convertE7(segment.startLocation.latitudeE7), convertE7(segment.startLocation.longitudeE7)];
            var endCoords = [convertE7(segment.endLocation.latitudeE7), convertE7(segment.endLocation.longitudeE7)];

            var polylinePoints = [startCoords];

            if (segment.waypointPath?.waypoints) {
                segment.waypointPath.waypoints.forEach(function (waypoint) {
                    polylinePoints.push([convertE7(waypoint.latE7), convertE7(waypoint.lngE7)]);
                });
            }

            polylinePoints.push(endCoords);

            L.polyline(polylinePoints, { color: 'blue' }).addTo(map);
            markers.addLayer(L.marker(startCoords));
            markers.addLayer(L.marker(endCoords));
        });
    }

    function processLargeDataInChunks(data, chunkSize) {
        let index = 0;

        function processChunk() {
            const chunk = data.slice(index, index + chunkSize);
            visualizeDataOnMapChunk(chunk);
            index += chunkSize;

            if (index < data.length) {
                setTimeout(processChunk, 0);
            }
        }

        processChunk();
    }

    function processFiles(files) {
        var fileReaders = Array.from(files).map(file => {
            if (file.name.endsWith('.json')) {
                return new Promise((resolve, reject) => {
                    var reader = new FileReader();
                    reader.onload = e => {
                        try {
                            resolve(JSON.parse(e.target.result));
                        } catch (error) {
                            console.error("Error parsing file", error);
                            reject(error);
                        }
                    };
                    reader.onerror = reject;
                    reader.readAsText(file);
                });
            }
        }).filter(Boolean);

        map.eachLayer(function (layer) {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        });
        markers.clearLayers();

        Promise.all(fileReaders).then(allData => {
            allData.forEach(data => {
                processLargeDataInChunks(data.timelineObjects, 100); // Чанки по 100 елементів
            });
        }).catch(console.error);
    }

    $('#uploadForm').on('submit', function (e) {
        e.preventDefault();
        var files = $('#jsonInput').get(0).files;
        if (files.length > 0) {
            processFiles(files);
            var label = files.length === 1 ? files[0].name : `${files.length} files`;
            $('.custom-file-label').text(label);
        }
    });

    $('.custom-file-input').on('change', function (e) {
        var fileLabel = e.target.files.length === 1 ? e.target.files[0].name : `${e.target.files.length} files`;
        $(this).next('.custom-file-label').addClass("selected").html(fileLabel);
    });
});
