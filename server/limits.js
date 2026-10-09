import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { AssistantError } from "./errors.js";

// Single Node process: serialize counters and each visitor's session operations.
export function createMutex() {
  const pending = new Map();
  return async (key, operation) => {
    const previous = pending.get(key) || Promise.resolve();
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => gate);
    pending.set(key, tail);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (pending.get(key) === tail) pending.delete(key);
    }
  };
}

export function createLimiter(directory) {
  const lock = createMutex();
  return (key, limit, seconds) =>
    lock(key, async () => {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const file = join(
        directory,
        `${createHash("sha256").update(key).digest("hex")}.json`,
      );
      let record;
      try {
        record = JSON.parse(await readFile(file, "utf8"));
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      const period = Math.floor(Date.now() / 1000 / seconds);
      const count = record?.period === period ? record.count : 0;
      if (count >= limit)
        throw new AssistantError(
          "You’ve reached the request limit. Please try later or email Reasad directly.",
          429,
        );
      await writeFile(
        `${file}.tmp`,
        JSON.stringify({ period, count: count + 1 }),
        { mode: 0o600 },
      );
      await rename(`${file}.tmp`, file);
    });
}
