"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CoordinateInputProps {
  lat: number;
  lon: number;
  onLatChange: (lat: number) => void;
  onLonChange: (lon: number) => void;
}

export function CoordinateInput({
  lat,
  lon,
  onLatChange,
  onLonChange,
}: CoordinateInputProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-1 space-y-2">
        <Label htmlFor="lat" className="text-sm font-medium text-foreground">
          Latitude
        </Label>
        <Input
          id="lat"
          type="number"
          step="0.0001"
          min={-90}
          max={90}
          value={lat}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v >= -90 && v <= 90) onLatChange(v);
          }}
          placeholder="-90 to 90"
          className="bg-white/70 backdrop-blur-md border-white/40"
        />
      </div>
      <div className="flex-1 space-y-2">
        <Label htmlFor="lon" className="text-sm font-medium text-foreground">
          Longitude
        </Label>
        <Input
          id="lon"
          type="number"
          step="0.0001"
          min={-180}
          max={180}
          value={lon}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v >= -180 && v <= 180) onLonChange(v);
          }}
          placeholder="-180 to 180"
          className="bg-white/70 backdrop-blur-md border-white/40"
        />
      </div>
    </div>
  );
}
