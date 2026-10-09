import test from "node:test";
import assert from "node:assert/strict";
import { expressionPoses } from "../src/data/assistant-expressions.js";
import {
  createExpressionMotion,
  expressionMorphDuration,
  sampleExpression,
  eyePath,
} from "../src/lib/assistant-expression-motion.js";

test("all expression pairs morph continuously from the visible pose", () => {
  for (const from of Object.keys(expressionPoses)) {
    for (const to of Object.keys(expressionPoses)) {
      if (from === to) continue;
      const motion = createExpressionMotion(from);
      const visible = motion.sample(1300);
      motion.setExpression(to, 1300);
      assert.deepEqual(
        motion.sample(1300),
        visible,
        `${from} -> ${to} jumped at its start`,
      );
      const nextFrame = motion.sample(1316);
      for (let eye = 0; eye < 2; eye++) {
        assert.ok(
          Math.abs(nextFrame.matrices[eye][4] - visible.matrices[eye][4]) < 0.1,
        );
        assert.ok(
          Math.abs(nextFrame.matrices[eye][5] - visible.matrices[eye][5]) < 0.1,
        );
      }
      assert.deepEqual(
        motion.sample(1300 + expressionMorphDuration),
        sampleExpression(to, expressionMorphDuration),
      );
    }
  }
});

test("interrupted morphs begin exactly where the eyes currently are", () => {
  const motion = createExpressionMotion();
  motion.setExpression("colere", 1000);
  const visible = motion.sample(1220);
  motion.setExpression("heureux", 1220);
  assert.deepEqual(motion.sample(1220), visible);
});

test("all expressions retain finite geometry and seamless alternating idle loops", () => {
  for (const [name, pose] of Object.entries(expressionPoses)) {
    assert.deepEqual(
      sampleExpression(name, 0),
      sampleExpression(name, pose.duration * 2),
    );
    for (let t = 0; t < pose.duration * 2; t += 16) {
      const sample = sampleExpression(name, t);
      assert.ok(sample.matrices.flat().every(Number.isFinite));
      assert.ok(
        sample.paths.every((path) => !/NaN|Infinity/.test(eyePath(path))),
      );
      for (const path of sample.paths) {
        // SVG arc flags must be literal 0/1, not decimal numbers.
        const arcs = [
          ...eyePath(path).matchAll(/A[\d.]+ [\d.]+ [\d.]+ ([^ ]+) ([^ ]+)/g),
        ];
        assert.equal(arcs.length, 4);
        assert.ok(
          arcs.every(
            ([, large, sweep]) => /^[01]$/.test(large) && /^[01]$/.test(sweep),
          ),
        );
      }
    }
  }
});
