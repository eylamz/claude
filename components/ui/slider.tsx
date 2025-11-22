'use client';

import { useState, useCallback } from 'react';

interface SliderProps {
  min: number;
  max: number;
  values: [number, number];
  onChange: (values: [number, number]) => void;
  step?: number;
}

export const Slider = ({ min, max, values, onChange, step = 1 }: SliderProps) => {
  const [localValues, setLocalValues] = useState(values);

  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newMin = Number(e.target.value);
      if (newMin <= localValues[1]) {
        const newValues: [number, number] = [newMin, localValues[1]];
        setLocalValues(newValues);
        onChange(newValues);
      }
    },
    [localValues, onChange]
  );

  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newMax = Number(e.target.value);
      if (newMax >= localValues[0]) {
        const newValues: [number, number] = [localValues[0], newMax];
        setLocalValues(newValues);
        onChange(newValues);
      }
    },
    [localValues, onChange]
  );

  const minPercent = ((localValues[0] - min) / (max - min)) * 100;
  const maxPercent = ((localValues[1] - min) / (max - min)) * 100;

  return (
    <div className="relative px-2">
      <div className="relative h-2 bg-black/10 dark:bg-black/30 rounded-full">
        <div
          className="absolute h-2 bg-brand-main dark:bg-brand-main rounded-full"
          style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
        />
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={localValues[0]}
          onChange={handleMinChange}
          step={step}
          className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer slider-thumb"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={localValues[1]}
          onChange={handleMaxChange}
          step={step}
          className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer slider-thumb"
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-header-text-dark dark:text-header-text">
        <span>₪{localValues[0]}</span>
        <span>₪{localValues[1]}</span>
      </div>
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--brand-main, #3b82f6);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider-thumb::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--brand-main, #3b82f6);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

