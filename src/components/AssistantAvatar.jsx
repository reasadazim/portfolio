import { useEffect, useId, useRef } from "react";
import { avatarBody } from "../data/assistant-expressions.js";
import {
  createExpressionMotion,
  eyePath,
  sampleExpression,
} from "../lib/assistant-expression-motion.js";

const initialPose = sampleExpression("neutre");

function paintEyes(eyes, pose) {
  eyes.forEach((eye, i) => {
    eye.setAttribute("d", eyePath(pose.paths[i]));
    eye.setAttribute("transform", `matrix(${pose.matrices[i].join(",")})`);
  });
}

export default function AssistantAvatar({ expression, small = false }) {
  const maskId = `assistant-face-${useId().replace(/:/g, "")}`;
  const eyes = useRef([]);
  const motion = useRef(null);
  const currentExpression = useRef(expression.current);
  if (!motion.current)
    motion.current = createExpressionMotion(
      expression.current,
      performance.now(),
    );

  useEffect(() => {
    currentExpression.current = expression.current;
    motion.current.setExpression(expression.current, performance.now());
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      paintEyes(eyes.current, sampleExpression(expression.current));
  }, [expression.current]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame;
    const tick = (time) => {
      paintEyes(eyes.current, motion.current.sample(time));
      frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      if (preference.matches)
        paintEyes(eyes.current, sampleExpression(currentExpression.current));
      else if (!document.hidden) frame = requestAnimationFrame(tick);
    };
    preference.addEventListener("change", resume);
    document.addEventListener("visibilitychange", resume);
    resume();
    return () => {
      cancelAnimationFrame(frame);
      preference.removeEventListener("change", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);

  return (
    <span
      className={`assistant-avatar${small ? " assistant-avatar-small" : ""}`}
      data-expression={expression.current}
      aria-hidden="true"
    >
      <svg viewBox="-125 -125 250 250" width="64" height="64">
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x="-125"
            y="-125"
            width="250"
            height="250"
          >
            <path d={avatarBody} fill="#fff" />
            {[0, 1].map((i) => (
              <path
                key={i}
                ref={(eye) => {
                  eyes.current[i] = eye;
                }}
                data-assistant-eye={i}
                d={eyePath(initialPose.paths[i])}
                transform={`matrix(${initialPose.matrices[i].join(",")})`}
                fill="#000"
              />
            ))}
          </mask>
        </defs>
        <path d={avatarBody} fill="#f9f9f9" />
        <g mask={`url(#${maskId})`}>
          <rect x="-125" y="-125" width="250" height="250" fill="#8b5cf6" />
        </g>
      </svg>
    </span>
  );
}
