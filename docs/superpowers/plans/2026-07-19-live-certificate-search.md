# Live Certificate Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show real-time full-name certificate suggestions after three characters, then retain the existing exact confirmation and download-token flow.

**Architecture:** A pure helper filters and limits public suggestion names. A new released-only public GET route returns names alone; `SemakSijil` debounces calls and invokes the existing POST route when a participant chooses a suggestion.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Supabase.

## Global Constraints

- Suggestions require at least three characters, return no more than eight full names, and expose no ID, token, IC or other form data.
- Suggestions work only after certificate release.
- Clicking a suggestion uses the current exact certificate verification route.
- Duplicate exact names remain blocked with the existing urus setia message.

### Task 1: Tested suggestion filtering and public route

**Files:** Create `src/lib/certificate-search.ts`, `src/lib/certificate-search.test.ts`, `src/app/api/e/[slug]/cadangan/route.ts`.

**Interfaces:** `suggestCertificateNames(names, query): string[]` normalises names, matches substrings, alphabetises and returns at most eight unique names.

- [ ] Write a failing test covering three-character matching, case-insensitive partial matches, eight-result limit and a two-character empty result.
- [ ] Run `npm.cmd run test -- src/lib/certificate-search.test.ts`; expected: FAIL before the helper exists.
- [ ] Implement the helper and route. The route validates `released`, rejects queries shorter than three characters with `[]`, selects only `name_value`, and returns `{ names }`.
- [ ] Re-run the focused test; expected: PASS.

### Task 2: Debounced participant UI

**Files:** Modify `src/app/e/[slug]/SemakSijil.tsx`.

**Interfaces:** After 300ms, the input requests `/api/e/<slug>/cadangan?q=<encoded query>`. Selecting a returned name calls the existing exact submit logic with that name.

- [ ] Add state for suggestions and suggestion loading; discard results for queries under three characters.
- [ ] Render up to eight buttons underneath the input and show `Mencari nama…` while the debounce request is pending.
- [ ] Keep the existing `Semak` button and display its exact-match error unchanged.
- [ ] Run `npm.cmd run test` and `npm.cmd run build`; expected: both PASS.

### Task 3: Document, verify and push

**Files:** Modify `README.md`, `AI_CONTEXT_LOG.md`; add this plan file to the documentation commit.

- [ ] Document live suggestions and their three-character/eight-result limit.
- [ ] Run `npm.cmd run test`, `git diff --check`, `npm.cmd run lint`, and `npm.cmd run build`; expected: all exit successfully.
- [ ] Commit as `feat: add live certificate name search` and push `main`.
