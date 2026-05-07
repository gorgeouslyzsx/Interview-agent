"use client";

import { clsx } from "clsx";

type Option<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ value, options, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            "h-8 rounded-md px-3 text-sm transition",
            option.value === value ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
