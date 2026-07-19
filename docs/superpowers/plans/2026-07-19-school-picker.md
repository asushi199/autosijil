# Searchable School Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sort the school directory by school code and let participants search school code or name before selecting a valid school.

**Architecture:** A shared pure filter function keeps matching predictable and testable. A small client picker replaces only the school `<select>`; it still returns the same code to the attendance form, so validation and certificate mapping remain unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest.

## Global Constraints

- UI copy remains Bahasa Melayu.
- Search matches code and name without case sensitivity.
- The selected attendance value remains a valid school code.
- All directory queries order by `code` ascending.
- Unit / Bahagian and participant-specific location continue using existing ordinary fields and template slots.

### Task 1: Add tested filtering and code ordering

**Files:** Create `src/lib/school-picker.ts`, `src/lib/school-picker.test.ts`; modify school-directory query callers.

**Interfaces:** `filterSchools(schools, query): SchoolDirectoryEntry[]` normalises case/space, filters code or name, and returns code-sorted results.

- [ ] Write a failing test that expects `filterSchools(schools, "aba10")` to find `ABA1001`, `filterSchools(schools, "dendang")` to find the same school, and an empty query to return `ABA1001` before `ABC1061`.
- [ ] Run `npm.cmd run test -- src/lib/school-picker.test.ts`; expected: FAIL because the module does not exist.
- [ ] Implement `filterSchools` using `school.code.localeCompare(other.code)` and a lowercase query matched against `code` or `name`.
- [ ] Change every `school_directory` list query from `.order("name")` to `.order("code")`.
- [ ] Re-run the focused test; expected: PASS.

### Task 2: Render the searchable picker

**Files:** Create `src/app/e/[slug]/SchoolPicker.tsx`; modify `src/app/e/[slug]/AttendanceForm.tsx`.

**Interfaces:** `SchoolPicker({ value, schools, required, onChange })` renders a search input, a filtered option list, and invokes `onChange(code)` only after a user selects a listed school.

- [ ] Add a client component with local `query` and `open` state. Its input placeholder is `Cari kod atau nama sekolah` and its empty-state text is `Tiada sekolah ditemui.`.
- [ ] Display the selected school with `schoolOptionLabel`; provide `— Pilih sekolah —` before a selection.
- [ ] Replace only the `f.type === "school"` branch in `AttendanceForm` with `SchoolPicker`; leave standard select, location dropdown and all other fields unchanged.
- [ ] Run `npm.cmd run test` and `npm.cmd run build`; expected: both PASS.

### Task 3: Document, verify and publish

**Files:** Modify `README.md`, `AI_CONTEXT_LOG.md`; add this plan file to the documentation commit.

- [ ] Document that the school picker is code-sorted and searchable by code or name.
- [ ] Run `npm.cmd run test`, `git diff --check`, `npm.cmd run lint`, and `npm.cmd run build`; expected: every command exits successfully.
- [ ] Commit the source and documentation with `feat: add searchable school picker`, then run `git push origin main`.
