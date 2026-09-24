import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Integration tests intentionally share the CI PostgreSQL database.
    // Run test files sequentially so one file's cleanup cannot delete
    // rows while another file is exercising the same real database.
    fileParallelism: false,
  },
});
