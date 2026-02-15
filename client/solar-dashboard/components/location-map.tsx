"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

interface LocationMapProps {
  lat: number;
  lon: number;
  onLocationChange: (lat: number, lon: number) => void;
}

// Fix Leaflet default icon issue with bundlers
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function LocationMap({ lat, lon, onLocationChange }: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [lat, lon],
      zoom: 5,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const marker = L.marker([lat, lon], { icon: DefaultIcon, draggable: true }).addTo(map);
    marker.bindPopup("Drag me or click the map to set location").openPopup();

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onLocationChange(
        parseFloat(pos.lat.toFixed(4)),
        parseFloat(pos.lng.toFixed(4)),
      );
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: newLat, lng: newLon } = e.latlng;
      marker.setLatLng([newLat, newLon]);
      onLocationChange(
        parseFloat(newLat.toFixed(4)),
        parseFloat(newLon.toFixed(4)),
      );
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Fix map sizing after mount
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Only run on mount — lat/lon updates handled by the other effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker when lat/lon change externally (e.g. manual input)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const currentPos = markerRef.current.getLatLng();
    if (
      Math.abs(currentPos.lat - lat) > 0.0001 ||
      Math.abs(currentPos.lng - lon) > 0.0001
    ) {
      markerRef.current.setLatLng([lat, lon]);
      mapRef.current.setView([lat, lon], mapRef.current.getZoom());
    }
  }, [lat, lon]);

  return (
    <div
      ref={mapContainerRef}
      className="h-87.5 w-full rounded-xl border border-white/40 shadow-md"
    />
  );
}
