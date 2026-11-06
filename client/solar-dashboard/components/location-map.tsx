"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import { Search, MapPin, Loader2, X } from "lucide-react";

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

export function LocationMap({
  lat,
  lon,
  onLocationChange,
  disabled = false,
}: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const disabledRef = useRef(disabled);
  const activeRef = useRef(false);
  const [mapActive, setMapActive] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const setScrollZoom = useCallback((enabled: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    activeRef.current = enabled;
    if (enabled) {
      map.scrollWheelZoom.enable();
      setMapActive(true);
    } else {
      map.scrollWheelZoom.disable();
      setMapActive(false);
    }
  }, []);

  const handleSearch = useCallback(
    (value: string) => {
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
    },
    [],
  );

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
      setQuery(result.display_name.split(",")[0]);
      setShowResults(false);
    },
    [onLocationChange],
  );

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

  // A press outside the map shell hands the wheel back to the page
  useEffect(() => {
    function onPointerDownOutside(e: PointerEvent) {
      if (shellRef.current && !shellRef.current.contains(e.target as Node)) {
        setScrollZoom(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDownOutside);
    return () => document.removeEventListener("pointerdown", onPointerDownOutside);
  }, [setScrollZoom]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [lat, lon],
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
      },
    ).addTo(map);

    const marker = L.marker([lat, lon], {
      icon: DefaultIcon,
      draggable: true,
    }).addTo(map);

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
      if (!activeRef.current) {
        setScrollZoom(true);
        return;
      }
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
      mapRef.current?.invalidateSize();
    }, 100);

    return () => {
      window.clearTimeout(invalidateTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    if (disabled) {
      marker.dragging?.disable();
    } else {
      marker.dragging?.enable();
    }
  }, [disabled]);

  return (
    <div className="space-y-3">
      {/* Search — Zenith plane, sharp edges */}
      <div
        ref={searchContainerRef}
        className="relative z-20 border border-white/15 bg-[#FEFDFB]"
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          {isSearching ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#F59E0B]" />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-[#71717A]" />
          )}

          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder="Search for a city or location…"
            disabled={disabled}
            className="font-mono-tech min-w-0 flex-1 bg-transparent text-sm text-[#18181B] outline-none placeholder:text-[#A1A1AA] disabled:opacity-50"
          />

          {query ? (
            <button
              type="button"
              onClick={() => {
                if (disabled) return;
                setQuery("");
                setResults([]);
                setShowResults(false);
              }}
              aria-label="Clear search"
              disabled={disabled}
              className="p-1 text-[#71717A] hover:text-[#18181B] disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {showResults && results.length > 0 ? (
          <div className="absolute top-full right-0 left-0 z-20 mt-px max-h-64 overflow-auto border border-white/15 bg-[#FEFDFB] shadow-lg">
            {results.map((r) => (
              <button
                key={r.place_id}
                type="button"
                onClick={() => handleSelect(r)}
                className="flex w-full items-start gap-2.5 border-b border-[#E6E3DC] px-3 py-2.5 text-left last:border-b-0 hover:bg-[#F3F1EC]"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
                <span className="line-clamp-2 text-sm leading-snug text-[#18181B]">
                  {r.display_name}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Map shell */}
      <div
        ref={shellRef}
        className="zenith-leaflet relative z-0 overflow-hidden border border-white/15 bg-[#121215]"
      >
        <div
          ref={mapContainerRef}
          className={`h-88 w-full ${disabled ? "pointer-events-none opacity-60" : ""}`}
        />

        {!disabled && !mapActive ? (
          <div className="pointer-events-none absolute bottom-3 left-3 z-500 border border-white/20 bg-[#18181B]/85 px-2.5 py-1.5 text-[10px] font-medium tracking-wide text-[#FAF8F5] uppercase">
            Click map to use it
          </div>
        ) : null}

        {disabled ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#18181B]/35 backdrop-blur-[1px]">
            <div className="border border-white/20 bg-[#FEFDFB] px-4 py-2 text-xs font-medium text-[#71717A]">
              Analysis locked
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
