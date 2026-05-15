"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import { Search, MapPin, Loader2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LocationMapProps {
  lat: number;
  lon: number;
  onLocationChange: (lat: number, lon: number) => void;
  disabled?: boolean;
}

/* ─── Nominatim Geocoding (free, no API key) ────────────── */

interface GeoResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

async function geocodeCity(query: string): Promise<GeoResult[]> {
  if (query.length < 2) return [];
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "5",
    addressdetails: "0",
    "accept-language": "en",
  });
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: { "User-Agent": "SolarDashboard/1.0" } },
  );
  if (!res.ok) return [];
  return res.json();
}

/* ─── Leaflet Icon Fix ──────────────────────────────────── */

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

/* ─── Component ─────────────────────────────────────────── */

export function LocationMap({ lat, lon, onLocationChange, disabled = false }: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const disabledRef = useRef(disabled);

  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  // Debounced geocoding search
  const handleSearch = useCallback((value: string) => {
    if (disabledRef.current) return;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      if (disabledRef.current) {
        setIsSearching(false);
        return;
      }
      const data = await geocodeCity(value.trim());
      if (disabledRef.current) {
        setIsSearching(false);
        return;
      }
      setResults(data);
      setShowResults(data.length > 0);
      setIsSearching(false);
    }, 350);
  }, [disabled]);

  // Select a result — zoom map and update coordinates
  const handleSelect = useCallback(
    (result: GeoResult) => {
      if (disabledRef.current) return;
      const newLat = parseFloat(parseFloat(result.lat).toFixed(4));
      const newLon = parseFloat(parseFloat(result.lon).toFixed(4));

      if (mapRef.current && markerRef.current) {
        markerRef.current.setLatLng([newLat, newLon]);
        mapRef.current.setView([newLat, newLon], 10, { animate: true });
      }

      onLocationChange(newLat, newLon);
      setQuery(result.display_name.split(",")[0]); // Show city name
      setShowResults(false);
    },
    [onLocationChange],
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize map — satellite imagery base layer
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [lat, lon],
      zoom: 5,
      zoomControl: true,
    });

    // Esri World Imagery provides satellite tiles without an API key.
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        maxZoom: 19,
      },
    ).addTo(map);

    const marker = L.marker([lat, lon], {
      icon: DefaultIcon,
      draggable: true,
    }).addTo(map);
    marker
      .bindPopup("Drag me or click the map to set location")
      .openPopup();

    marker.on("dragend", () => {
      if (disabledRef.current) return;
      const pos = marker.getLatLng();
      onLocationChange(
        parseFloat(pos.lat.toFixed(4)),
        parseFloat(pos.lng.toFixed(4)),
      );
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (disabledRef.current) return;
      const { lat: newLat, lng: newLon } = e.latlng;
      marker.setLatLng([newLat, newLon]);
      onLocationChange(
        parseFloat(newLat.toFixed(4)),
        parseFloat(newLon.toFixed(4)),
      );
    });

    mapRef.current = map;
    markerRef.current = marker;

    const invalidateTimer = window.setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);

    return () => {
      window.clearTimeout(invalidateTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker when lat/lon change externally
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
    <div className="space-y-3">
      <Card className="glass-card">
        <CardContent className="p-3">
          <div ref={searchContainerRef} className="relative">
            <div className="flex items-center gap-2">
              {isSearching ? (
                <Loader2 className="h-4 w-4 text-amber-500 animate-spin shrink-0" />
              ) : (
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              )}

              <Input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => results.length > 0 && setShowResults(true)}
                placeholder="Search for a city or location…"
                className="bg-background/70"
                disabled={disabled}
              />

              {query && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    if (disabled) return;
                    setQuery("");
                    setResults([]);
                    setShowResults(false);
                  }}
                  aria-label="Clear search"
                  disabled={disabled}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {showResults && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white/95 backdrop-blur-md border border-white/60 rounded-xl shadow-lg shadow-black/10 overflow-hidden">
                {results.map((r) => (
                  <button
                    key={r.place_id}
                    onClick={() => handleSelect(r)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-amber-50/60 transition-colors cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <MapPin className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground leading-snug line-clamp-2">
                      {r.display_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card overflow-hidden">
        <CardContent className="relative p-0">
          <div
            ref={mapContainerRef}
            className={`h-87.5 w-full ${disabled ? "pointer-events-none opacity-60" : ""}`}
          />
          {disabled && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/20 backdrop-blur-[1px]">
              <div className="rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm">
                Analysis locked
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
