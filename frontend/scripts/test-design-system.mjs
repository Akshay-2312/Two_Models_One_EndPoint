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

console.log("Design system contract tests passed.");
