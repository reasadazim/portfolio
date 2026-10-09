import { readFileSync, writeFileSync } from "node:fs";
import { assistantExpressions } from "../src/hooks/useAssistantExpression.js";

const numberPattern = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
const numbers = (value) =>
  [...value.matchAll(numberPattern)].map(([n]) => Number(n));
let template;
let body;
const expressions = {};
for (const name of assistantExpressions) {
  const svg = readFileSync(
    new URL(`../public/assets/chat/expressions/${name}.svg`, import.meta.url),
    "utf8",
  );
  body ??= svg.match(/<mask[^>]*><path d="([^"]+)"/)[1];
  const eyes = [...svg.matchAll(/<path d="([^"]+)" class="oeil[01]"/g)].map(
    ([, d]) => d,
  );
  const paths = eyes.map((d) => {
    const parts = d.split(numberPattern);
    template ??= parts;
    if (JSON.stringify(parts) !== JSON.stringify(template))
      throw new Error(`Incompatible eye path: ${name}`);
    return numbers(d);
  });
  const frames = [0, 1].map((eye) => {
    const css = svg
      .split(`@keyframes oeil${eye}{`)[1]
      .split("}}</style>")[0]
      .split("}@keyframes")[0];
    return [...css.matchAll(/([\d.]+)%\{transform:matrix\(([^)]+)\)/g)].map(
      ([, percent, matrix]) => [Number(percent) / 100, ...numbers(matrix)],
    );
  });
  if (eyes.length !== 2 || frames.some((f) => f.length < 2))
    throw new Error(`Incomplete expression: ${name}`);
  expressions[name] = {
    paths,
    frames,
    duration: Number(svg.match(/animation-duration:([\d.]+)s/)[1]) * 1000,
  };
}
writeFileSync(
  new URL("../src/data/assistant-expressions.js", import.meta.url),
  `// Generated from the supplied SVGs by build/generate-assistant-expressions.mjs.\nexport const eyePathTemplate = ${JSON.stringify(template)};\nexport const avatarBody = ${JSON.stringify(body)};\nexport const expressionPoses = ${JSON.stringify(expressions)};\n`,
);
console.log(
  `Extracted ${assistantExpressions.length} expressions and their original blink/gaze keyframes.`,
);
