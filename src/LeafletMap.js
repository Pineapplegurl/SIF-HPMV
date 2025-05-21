/*import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; 
import './LeafletMap.css';


function LeafletMap() {
  const mapRef = useRef(null); 

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map', {
        center: [43.5, 7], 
        zoom: 9,
        minZoom: 6,
        maxZoom: 16,
        preferCanvas: true, 
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
        opacity: 0.8,
      }).addTo(mapRef.current);

      L.tileLayer('http://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: 'Data © OpenStreetMap contributors, Style: CC-BY-SA 2.0 OpenRailwayMap',
        tileSize: 256,
        opacity: 1,
      }).addTo(mapRef.current);

      L.rectangle(
        [[44, 4], [42, 8]], // Encasing region
        { color: 'black', weight: 2, fillOpacity: 0 }
      ).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      id="map"
      style={{
        width: '100%',
        height: '350px', // Adjusted height
        margin: '20px auto',
        borderRadius: '10px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)', // Added shadow
      }}
    />
  );
}

export default LeafletMap;*/