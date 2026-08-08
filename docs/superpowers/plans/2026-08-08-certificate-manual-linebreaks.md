# Certificate Manual Line Breaks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-program certificate title with manual newlines, plus multiline Teks Statik in the template editor.

**Architecture:** Store optional `events.certificate_title` (may contain `\n`). PDF/`attendeeValues` prefer it over `title` when non-empty. Template editor uses a textarea for static text; existing `wrapLines` already honours `\n`.

**Tech Stack:** Next.js, TypeScript, Supabase SQL (`migration.sql`), Vitest.

## Global Constraints

- UI copy Bahasa Melayu; code identifiers English.
- Schema changes idempotent in `supabase/migration.sql`.
- PDF still generated on-demand; no PDF storage.
- Shared templates remain reusable across programs.

### Task 1: Schema, types, resolve helper + tests

**Files:**
- Modify: `supabase/migration.sql`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/sijil-data.ts`
- Create/Modify: `src/lib/sijil-data.test.ts` (or add tests next to helper)
- Modify: `src/app/admin/actions.ts`
- Modify: `src/app/api/admin/events/[id]/sample/route.ts`

**Interfaces:**
- `certificateEventName(event): string` — non-empty trimmed `certificate_title` else `title` (preserve internal newlines of custom value).
- `EventRow.certificate_title: string | null`
- `UpdateEventPayload.certificate_title: string | null`

- [x] Add failing tests for `certificateEventName` (null/empty → title; custom with `\n` preserved).
- [x] Add column + types + helper; wire `attendeeValues` and sample route.
- [x] Run focused tests; expect PASS.

### Task 2: Event editor UI

**Files:**
- Modify: `src/app/admin/events/[id]/edit/EventEditor.tsx`

- [x] State `certificateTitle` init `event.certificate_title ?? event.title`.
- [x] Textarea 「Nama pada sijil」 when certificate required; button 「Salin semula dari Nama program」.
- [x] Smart sync: changing `title` updates textarea only if it still equals previous title.
- [x] Include `certificate_title` in `updateEvent` payload.

### Task 3: Teks Statik multiline

**Files:**
- Modify: `src/app/admin/templates/[id]/TemplateEditor.tsx`

- [x] Replace static text `<input>` with `<textarea rows={4}>`.
- [x] Optional hint that Enter creates a new line (mod Balut).

### Task 4: Docs, verify, commit, push

**Files:**
- Modify: `AI_CONTEXT_LOG.md`
- Spec/plan already under `docs/superpowers/`

- [x] Log decision in `AI_CONTEXT_LOG.md`.
- [x] `npm run test`, `npm run lint`, `npm run build`.
- [x] Commit and push.
