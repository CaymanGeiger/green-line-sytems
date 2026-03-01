"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type SavedViewOption = {
  id: string;
  name: string;
  filters: Record<string, string | number | boolean>;
};

type PageSavedViewPickerProps = {
  pageLabel: string;
  options: SavedViewOption[];
  formId: string;
  fieldNames: string[];
  defaultValues?: Record<string, string | number | boolean>;
};

function asBool(value: string | number | boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  return value === "1" || value === "true" || value === "yes";
}

export function PageSavedViewPicker({
  pageLabel,
  options,
  formId,
  fieldNames,
  defaultValues = {},
}: PageSavedViewPickerProps) {
  const [selectedViewId, setSelectedViewId] = useState("");

  function applyFiltersToForm(filters: Record<string, string | number | boolean>) {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    fieldNames.forEach((fieldName) => {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement)) {
        return;
      }
      const defaultValue = defaultValues[fieldName];
      if (input instanceof HTMLInputElement && input.type === "checkbox") {
        input.checked = defaultValue !== undefined ? asBool(defaultValue) : false;
        return;
      }
      input.value = defaultValue !== undefined ? String(defaultValue) : "";
    });

    Object.entries(filters).forEach(([fieldName, value]) => {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement)) {
        return;
      }
      if (input instanceof HTMLInputElement && input.type === "checkbox") {
        input.checked = asBool(value);
        return;
      }
      input.value = String(value);
    });
  }

  function onViewSelected(viewId: string) {
    setSelectedViewId(viewId);
    const selectedView = options.find((option) => option.id === viewId);
    if (!selectedView) {
      return;
    }
    applyFiltersToForm(selectedView.filters);
  }

  function onClearView() {
    setSelectedViewId("");
    applyFiltersToForm({});
  }

  if (options.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        No saved {pageLabel} views yet. Create one from the Saved Views page.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex min-w-56 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Saved {pageLabel} view
        <select
          value={selectedViewId}
          onChange={(event) => onViewSelected(event.target.value)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700"
        >
          <option value="">Select a view</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="button"
        variant="secondary"
        onClick={onClearView}
        className="h-10 px-4 text-sm bg-slate-100 text-slate-800 ring-slate-300 shadow-sm hover:bg-slate-200"
      >
        Remove view from search
      </Button>
    </div>
  );
}
