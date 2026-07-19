"use client";

import { useId, useMemo, useState } from "react";
import { schoolOptionLabel, type SchoolDirectoryEntry } from "@/lib/school-directory";
import { filterSchools } from "@/lib/school-picker";

export default function SchoolPicker({
  value,
  schools,
  required,
  onChange,
}: {
  value: string;
  schools: SchoolDirectoryEntry[];
  required: boolean;
  onChange: (code: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const listId = useId();
  const selected = schools.find((school) => school.code === value);
  const results = useMemo(() => filterSchools(schools, query), [query, schools]);
  const displayedValue = open ? query : selected ? schoolOptionLabel(selected) : "";

  return (
    <div className="relative">
      <input
        className="input"
        required={required}
        value={displayedValue}
        placeholder="Cari kod atau nama sekolah"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(event) => {
          setOpen(true);
          setQuery(event.target.value);
          if (value) onChange("");
        }}
        onBlur={() => {
          setOpen(false);
          setQuery("");
        }}
      />
      {open && (
        <div id={listId} role="listbox" className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white p-1 shadow-lg">
          {results.length ? results.map((school) => (
            <button
              key={school.code}
              type="button"
              role="option"
              aria-selected={school.code === value}
              className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-blue-50"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(school.code);
                setQuery("");
                setOpen(false);
              }}
            >
              {schoolOptionLabel(school)}
            </button>
          )) : (
            <p className="px-3 py-2 text-sm text-gray-500">Tiada sekolah ditemui.</p>
          )}
        </div>
      )}
    </div>
  );
}
