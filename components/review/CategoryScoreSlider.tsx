"use client";

import { Star } from "lucide-react";
import { brand } from "@/lib/brand";
import type { GrievanceCategoryKey } from "@/lib/reviewValidation";

interface CategoryScoreSliderProps {
  categoryKey: GrievanceCategoryKey;
  label: string;
  value: number; // 1–5
  onChange: (value: number) => void;
}

export function CategoryScoreSlider({ label, value, onChange, categoryKey }: CategoryScoreSliderProps) {
  const fillPct = ((value - 1) / 4) * 100;

  return (
    <div className="flex flex-col gap-2 py-3" data-category={categoryKey}>
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={`score-${categoryKey}`}
          className="text-sm font-medium text-[var(--ks-text)]"
        >
          {label}
        </label>
        <div className="flex items-center gap-1" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={16}
              strokeWidth={1.5}
              className={star <= value ? "fill-current" : "fill-transparent"}
              style={{
                color: star <= value ? brand.coral : "var(--ks-text-faint)",
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative flex items-center">
        <div
          className="absolute h-1.5 w-full rounded-full"
          style={{ background: "var(--ks-border-soft)" }}
        />
        <div
          className="absolute h-1.5 rounded-full transition-[width]"
          style={{
            width: `${fillPct}%`,
            background: `linear-gradient(90deg, ${brand.coral}, ${brand.magenta})`,
          }}
        />
        <input
          id={`score-${categoryKey}`}
          type="range"
          min={1}
          max={5}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative z-10 h-1.5 w-full cursor-pointer appearance-none bg-transparent
            [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
            [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:bg-[var(--ks-coral)]
            [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white
            [&::-moz-range-thumb]:bg-[var(--ks-coral)]"
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={value}
          aria-label={`${label}: ${value} out of 5`}
        />
      </div>
    </div>
  );
}
