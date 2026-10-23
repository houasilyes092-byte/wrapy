// Visual identity per category, matched on the slug so renamed categories keep
// their look. Unknown categories get a neutral branded texture.
const THEMES = ["carbon", "marble", "anime", "neon", "minimal"] as const;

export function categoryTextureClass(slug: string): string {
  const theme = THEMES.find((name) => slug.toLowerCase().includes(name));
  return `cat-texture cat-texture--${theme ?? "default"}`;
}
