import { useEffect, useState } from "react";

export const assistantExpressions = [
  "neutre",
  "somnolent",
  "blase",
  "timide",
  "fier",
  "curieux",
  "confus",
  "mefiant",
  "effraye",
  "triste",
  "colere",
  "hilare",
  "heureux",
  "excite",
  "surpris",
  "attentif",
];

export const expressionSource = (name) => `assets/chat/expressions/${name}.svg`;

function shuffled(names) {
  const result = [...names];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function useAssistantExpression(excited = false) {
  const [expression, setExpression] = useState({
    current: "neutre",
  });
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let current = "neutre";
    let remaining = shuffled(
      assistantExpressions.filter((name) => name !== current),
    );
    let timer;
    const schedule = () => {
      clearTimeout(timer);
      if (motion.matches || document.hidden) return;
      timer = setTimeout(() => {
        if (!remaining.length) {
          remaining = shuffled(assistantExpressions);
          // Every expression appears once per round, with no repeat at its boundary.
          if (remaining.at(-1) === current) {
            [remaining[0], remaining[remaining.length - 1]] = [
              remaining[remaining.length - 1],
              remaining[0],
            ];
          }
        }
        const next = remaining.at(-1);
        remaining.pop();
        setExpression({ current: next });
        current = next;
        schedule();
      }, 3000);
    };
    const onMotion = () => {
      if (motion.matches) {
        current = "neutre";
        remaining = shuffled(
          assistantExpressions.filter((name) => name !== current),
        );
        setExpression({ current });
      }
      schedule();
    };
    motion.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", schedule);
    schedule();
    return () => {
      clearTimeout(timer);
      motion.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, []);
  return excited ? { current: "excite" } : expression;
}
