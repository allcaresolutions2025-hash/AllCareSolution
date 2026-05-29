// Turn a title into a URL-safe slug: lowercase, hyphenated, ASCII-ish.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // drop punctuation
    .replace(/[\s_]+/g, "-") // spaces/underscores -> hyphen
    .replace(/-+/g, "-") // collapse repeats
    .replace(/^-|-$/g, "") // trim hyphens
    .slice(0, 80);
}
