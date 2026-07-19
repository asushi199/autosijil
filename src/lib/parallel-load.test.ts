import { describe, expect, it } from "vitest";

import { loadInParallel } from "./parallel-load";

describe("loadInParallel", () => {
  it("starts the second loader before the first loader resolves", async () => {
    let resolveFirst: ((value: string) => void) | undefined;
    let secondStarted = false;

    const first = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });

    const result = loadInParallel(
      () => first,
      async () => {
        secondStarted = true;
        return "second";
      },
    );

    expect(secondStarted).toBe(true);
    resolveFirst?.("first");
    await expect(result).resolves.toEqual(["first", "second"]);
  });
});
