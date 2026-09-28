/**
 * Safe one-shot migration entrypoint for global sub-categories.
 * Idempotent: creates globals, links store categories, never deletes data.
 *
 * Usage: npx tsx src/scripts/seed-global-categories.ts
 */
import { seedAndLinkGlobalCategories } from "@/lib/stores/global-categories-seed";

async function main(): Promise<void> {
  await seedAndLinkGlobalCategories();
  console.log("[seed-global-categories] done");
}

main().catch((error: unknown) => {
  console.error("[seed-global-categories]", error);
  process.exitCode = 1;
});
