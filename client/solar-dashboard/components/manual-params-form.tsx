"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ManualParamsFormProps {
  onSubmit: (features: Record<string, number>) => void;
  isLoading: boolean;
}

const FEATURE_FIELDS = [
  { key: "Temperature", label: "Temperature", unit: "°C", min: -60, max: 60, step: 0.1, placeholder: "e.g. 32.5" },
  { key: "Humidity", label: "Humidity", unit: "%", min: 0, max: 100, step: 0.1, placeholder: "e.g. 45.0" },
  { key: "Wind Speed", label: "Wind Speed", unit: "m/s", min: 0, max: 50, step: 0.1, placeholder: "e.g. 3.5" },
  { key: "Clear Sky Irradiance", label: "Clear Sky Irradiance", unit: "kWh/m²/day", min: 0, max: 15, step: 0.01, placeholder: "e.g. 6.5" },
];

export function ManualParamsForm({ onSubmit, isLoading }: ManualParamsFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const features: Record<string, number> = {};
    for (const field of FEATURE_FIELDS) {
      const val = parseFloat(values[field.key] ?? "");
      if (isNaN(val)) return; // Incomplete — don't submit
      features[field.key] = val;
    }
    onSubmit(features);
  };

  const allFilled = FEATURE_FIELDS.every((f) => {
    const v = parseFloat(values[f.key] ?? "");
    return !isNaN(v);
  });

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Enter parameters manually instead
      </button>

      {isOpen && (
        <div className="space-y-4 rounded-xl bg-white/50 backdrop-blur-sm border border-white/40 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURE_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key} className="text-sm">
                  {field.label}{" "}
                  <span className="text-muted-foreground">({field.unit})</span>
                </Label>
                <Input
                  id={field.key}
                  type="number"
                  step={field.step}
                  min={field.min}
                  max={field.max}
                  value={values[field.key] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                  className="bg-white/70 border-white/40"
                />
              </div>
            ))}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!allFilled || isLoading}
            className="w-full bg-amber-400 hover:bg-amber-500 text-foreground font-medium"
          >
            {isLoading ? "Analyzing…" : "Analyze with Manual Parameters"}
          </Button>
        </div>
      )}
    </div>
  );
}
