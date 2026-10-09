import {
  eyePathTemplate,
  expressionPoses,
} from "../data/assistant-expressions.js";

export const expressionMorphDuration = 850;
const mix = (from, to, amount) =>
  from.map((value, i) => value + (to[i] - value) * amount);

function sampleEye(frames, phase) {
  let i = 1;
  while (i < frames.length - 1 && frames[i][0] < phase) i++;
  const before = frames[i - 1];
  const after = frames[i];
  return mix(
    before.slice(1),
    after.slice(1),
    (phase - before[0]) / (after[0] - before[0]),
  );
}

export function sampleExpression(name, elapsed = 0) {
  const pose = expressionPoses[name] ?? expressionPoses.neutre;
  // The exported SVGs alternate forward/backward, so the loop has no seam.
  const cycle = (Math.max(0, elapsed) / pose.duration) % 2;
  const phase = cycle <= 1 ? cycle : 2 - cycle;
  return {
    paths: pose.paths,
    matrices: pose.frames.map((frames) => sampleEye(frames, phase)),
  };
}

export function eyePath(values) {
  return eyePathTemplate.reduce(
    (path, part, i) =>
      path + part + (i < values.length ? Number(values[i].toFixed(4)) : ""),
    "",
  );
}

export function createExpressionMotion(name = "neutre", now = 0) {
  let current = name;
  let startedAt = now;
  let from = null;
  const sample = (time) => {
    const elapsed = Math.max(0, time - startedAt);
    const target = sampleExpression(current, elapsed);
    if (!from || elapsed >= expressionMorphDuration) return target;
    const t = elapsed / expressionMorphDuration;
    // Smooth acceleration and deceleration; the silhouette never fades.
    const eased = t * t * t * (t * (t * 6 - 15) + 10);
    return {
      paths: target.paths.map((path, i) => mix(from.paths[i], path, eased)),
      matrices: target.matrices.map((matrix, i) =>
        mix(from.matrices[i], matrix, eased),
      ),
    };
  };
  return {
    sample,
    setExpression(name, time) {
      if (name === current || !expressionPoses[name]) return;
      // Start from the actual visible pose, even if another change interrupts a morph.
      from = sample(time);
      current = name;
      startedAt = time;
    },
  };
}
