import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const tokens = await read("../styles/tokens.css");
const globals = await read("../styles/globals.css");
const index = await read("../pages/index.tsx");
const layout = await read("../components/Layout.tsx");
const button = await read("../components/ui/Button.tsx");
const meter = await read("../components/ui/Meter.tsx");

// Every semantic role the pages use must exist in the token layer.
const requiredTokens = [
  "--color-bg",
  "--color-surface",
  "--color-surface-raised",
  "--color-surface-input",
  "--color-border",
  "--color-border-strong",
  "--color-text",
  "--color-text-muted",
  "--color-text-subtle",
  "--color-primary",
  "--color-primary-strong",
  "--color-primary-ink",
  "--color-ai-accent",
  "--color-success",
  "--color-warning",
  "--color-danger",
  "--font-display",
  "--font-sans",
  "--font-mono",
  "--radius-sm",
  "--radius-md",
  "--radius-lg",
  "--duration-fast",
  "--ease-out",
];
for (const token of requiredTokens) {
  assert.match(tokens, new RegExp(`${token}:`), `${token} must be declared in tokens.css`);
}

// The stylesheet may only reach colour and type through tokens.
const css = globals.replace(/\/\*[\s\S]*?\*\//g, "");
assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, "globals.css must not contain hex colours");
assert.doesNotMatch(css, /rgba?\(/, "globals.css must not contain literal rgb() colours");
assert.doesNotMatch(css, /font-family:(?!\s*var\()/, "globals.css must only set font-family from a token");
assert.doesNotMatch(css, /transition:\s*all/, "transition: all is banned");

// Primitives exist and keep their accessibility contracts.
assert.match(button, /type = "button"/);
assert.match(button, /button--\$\{variant\}/);
assert.match(css, /\.button--secondary/);
assert.match(css, /\.button:disabled/);
assert.match(meter, /<progress/);
assert.match(meter, /className=\{`meter__track meter__track--\$\{tone\}`\}/);

// Pages compose the primitives instead of restyling raw markup.
assert.match(index, /from "\.\.\/components\/ui"/);
assert.match(layout, /from "\.\/ui\/Badge"/);

// Responsive shell: the badge stays visible on mobile and the hero keeps source order.
assert.match(css, /grid-template-areas:/);
assert.doesNotMatch(css, /\.sidebar-note\s*\{[^}]*display:\s*none/);
assert.doesNotMatch(css, /order:\s*-1/);
assert.match(css, /:focus-visible/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);

// Collapsible shell: one persisted state drives a mark-only rail.
assert.match(tokens, /--sidebar-rail-width:/);
assert.match(css, /\[data-sidebar="collapsed"\]/);
assert.match(css, /\.sidebar-toggle/);
assert.match(css, /clip-path: inset\(50%\)/);

// Landing: the display size is a token and the hero uses a word mask.
assert.match(tokens, /--font-size-hero:/);
assert.match(css, /\.hero-word/);
assert.match(css, /\.ink-hero__phrase/);
assert.match(css, /\.reveal\[data-reveal="armed"\]/);

// Landing restraint after the unslop pass: the plate stays one ink ramp, with no
// second hue and no blur, and the accent is kept for action and links instead of
// the three capability labels.
const wash = css.match(/\.ink-hero__wash\s*\{[^}]*\}/)?.[0] ?? "";
assert.match(wash, /--ink-wash-core/, "the ink plate must keep its wash");
assert.doesNotMatch(wash, /--color-ai-surface/, "violet is the model channel, not plate atmosphere");
assert.doesNotMatch(wash, /blur\(/, "the plate wash is not a blurred glow");
assert.match(css, /\.capability__index\s*\{[^}]*color:\s*var\(--color-text-subtle\)/);
assert.match(css, /\.hero__title\s*\{[^}]*letter-spacing:\s*var\(--tracking-display\)/);

console.log("Design system contract tests passed.");
