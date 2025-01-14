import React, { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Important: Leaflet's default CSS

function LeafletMap() {
  useEffect(() => {
    // 1. Create the map
    const map = L.map('map').setView([48.8566, 2.3522], 5); 
    // ^ Center on France, zoom level 5, just like your HTML snippet

    // 2. Add a base tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // 3. Add the OpenRailwayMap overlay
    const openRailwayMap = L.tileLayer(
      'http://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          'Data © OpenStreetMap contributors, Style: CC-BY-SA 2.0 OpenRailwayMap',
        tileSize: 256
      }
    );

    // Add it on top of the base layer
    openRailwayMap.addTo(map);

    // OPTIONAL: If you want to toggle the OpenRailwayMap layer on/off,
    // you could set up a Layer Control:
    // L.control.layers(null, { 'OpenRailwayMap': openRailwayMap }).addTo(map);

    // Return a cleanup function if necessary (e.g., to remove event handlers)
    return () => {
      map.remove(); // remove map on unmount if needed
    };
  }, []);

  // Return a div with a known ID or ref so Leaflet can hook into it
  return (
    <div
      id="map"
      style={{
        width: '100%',
        height: '500px', // for example
      }}
    />
  );
}

export default LeafletMap;
