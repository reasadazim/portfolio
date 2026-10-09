// Elliptical trajectories grow toward each click while the colored disc stays anchored.
export function initOrbits(hero, header) {
  const controller = new AbortController();
  const { signal } = controller;
  const orbit = hero.querySelector(".orbit");
  const ring = orbit.querySelector(".ring");
  const disc = orbit.querySelector(".disc");
  const moon = orbit.querySelector(".moon");
  const coordinate = orbit.querySelector(".coordinate");
  const readout = orbit.querySelector(".orbit-readout");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("orbit-paths");
  svg.setAttribute("aria-hidden", "true");
  const paths = [0, 1].map(() => {
    const ellipse = document.createElementNS(svg.namespaceURI, "ellipse");
    svg.appendChild(ellipse);
    return ellipse;
  });
  orbit.prepend(svg);
  const marker = document.createElement("span");
  marker.className = "click-marker";
  marker.setAttribute("aria-hidden", "true");
  orbit.appendChild(marker);
  orbit.classList.add("orbit-live");
  [ring, moon, disc].forEach((button) =>
    button.setAttribute("aria-label", "Play orbital animation"),
  );
  let width = 0,
    height = 0,
    anchor,
    small = false;
  let clock = 0,
    last = null,
    frame = null,
    paused = hero.classList.contains("is-paused");
  let burst = null,
    phase = 0,
    moonPhase = 0,
    paletteIndex = 0;
  let trajectories = null,
    effectStrength = 0;
  const colors = ["#b17cf0", "#98b9d7", "#b89b16", "#d69ba8", "#92bca8"];
  const duration = 4800;
  // Zero velocity and acceleration at either end of each expansion/return.
  function ease(value) {
    const t = Math.max(0, Math.min(1, value));
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  function envelopeAt(progress) {
    if (!burst) return 0;
    if (progress < 0.32)
      return (
        burst.fromStrength + (1 - burst.fromStrength) * ease(progress / 0.32)
      );
    return 1 - ease((progress - 0.32) / 0.68);
  }
  function place(element, point, diameter) {
    element.style.transform = `translate(${point.x - diameter / 2}px, ${point.y - diameter / 2}px)`;
  }
  function position(angle, cx, cy, a, b, tilt) {
    const u = Math.cos(angle) * a,
      v = Math.sin(angle) * b;
    return {
      x: cx + u * Math.cos(tilt) - v * Math.sin(tilt),
      y: cy + u * Math.sin(tilt) + v * Math.cos(tilt),
    };
  }
  function draw(dt = 0) {
    if (!anchor) return;
    const progress = burst
      ? Math.min(1, (clock - burst.started) / duration)
      : 1;
    const envelope = envelopeAt(progress);
    const dx = burst ? burst.x - anchor.x : 0,
      dy = burst ? burst.y - anchor.y : 0;
    const direction = Math.atan2(dy, dx);
    const reach =
      Math.min(Math.hypot(dx, dy) * 0.48, small ? 100 : 260) * envelope;
    const radius = small ? 78 : 140;
    const dxAxis = Math.cos(direction),
      dyAxis = Math.sin(direction);
    const separation = envelope * (small ? 24 : 55);
    // The ring takes a taller, larger, lower sweep. The small circle follows a
    // flatter, smaller ellipse above it, with a different center and inclination.
    const targets = [
      {
        cx: anchor.x + dxAxis * reach - dyAxis * separation,
        cy: anchor.y + dyAxis * reach + dxAxis * separation,
        a: radius + reach * 1.16,
        b: radius + envelope * (small ? 58 : 130),
        tilt: (direction + 0.42) * envelope,
      },
      {
        cx: anchor.x + dxAxis * reach * 0.9 + dyAxis * separation,
        cy: anchor.y + dyAxis * reach * 0.9 - dxAxis * separation,
        a: radius * 0.82 + reach * 0.82,
        b: radius * 0.72 + envelope * (small ? 32 : 78),
        tilt: (direction - 0.22) * envelope,
      },
    ];
    // Retarget from the current geometry, so consecutive clicks never teleport circles.
    if (!trajectories || reduceMotion.matches)
      trajectories = targets.map((target) => ({ ...target }));
    const blend = 1 - Math.exp(-dt / 170);
    trajectories.forEach((trajectory, i) => {
      const target = targets[i];
      ["cx", "cy", "a", "b"].forEach(
        (key) => (trajectory[key] += (target[key] - trajectory[key]) * blend),
      );
      const angleDelta = Math.atan2(
        Math.sin(target.tilt - trajectory.tilt),
        Math.cos(target.tilt - trajectory.tilt),
      );
      trajectory.tilt += angleDelta * blend;
    });
    effectStrength += (envelope - effectStrength) * blend;
    const [ringPath, moonPath] = trajectories;
    const ringPoint = position(
      phase + 2.2,
      ringPath.cx,
      ringPath.cy,
      ringPath.a,
      ringPath.b,
      ringPath.tilt,
    );
    const moonPoint = position(
      -moonPhase + 0.5,
      moonPath.cx,
      moonPath.cy,
      moonPath.a,
      moonPath.b,
      moonPath.tilt,
    );
    place(disc, anchor, small ? 98 : 120);
    place(ring, ringPoint, small ? 98 : 120);
    place(moon, moonPoint, small ? 39 : 48);
    paths.forEach((path, i) => {
      const trajectory = trajectories[i];
      path.setAttribute("cx", trajectory.cx);
      path.setAttribute("cy", trajectory.cy);
      path.setAttribute("rx", trajectory.a);
      path.setAttribute("ry", trajectory.b);
      path.setAttribute(
        "transform",
        `rotate(${(trajectory.tilt * 180) / Math.PI} ${trajectory.cx} ${trajectory.cy})`,
      );
    });
    svg.style.opacity = effectStrength * 0.7;
    coordinate.style.opacity = readout.style.opacity = effectStrength;
    coordinate.textContent = `${Math.round(ringPoint.x)}, ${Math.round(ringPoint.y)} / a 1.1`;
    readout.textContent = `${Math.round(moonPoint.x)}, ${Math.round(moonPoint.y)} / a 0.8`;
    coordinate.style.transform = `translate(${ringPoint.x + 28}px, ${ringPoint.y + 30}px)`;
    readout.style.transform = `translate(${moonPoint.x + 24}px, ${moonPoint.y + 24}px)`;
    marker.style.opacity = burst ? Math.min(1, (1 - progress) * 4) : 0;
    if (burst && progress >= 1) {
      burst = null;
      [ring, disc, moon].forEach((button) =>
        button.setAttribute("aria-pressed", "false"),
      );
    }
  }
  function tick(time) {
    frame = null;
    const dt = last === null ? 0 : Math.min(time - last, 50);
    last = time;
    if (!paused && !reduceMotion.matches) {
      clock += dt;
      const activity = envelopeAt(
        burst ? Math.min(1, (clock - burst.started) / duration) : 1,
      );
      phase += dt * (0.00032 + activity * 0.00135);
      moonPhase += dt * (0.00027 + activity * 0.0011);
    }
    draw(dt);
    if (!paused && !reduceMotion.matches) frame = requestAnimationFrame(tick);
  }
  function wake() {
    if (frame === null && !paused && !reduceMotion.matches) {
      last = null;
      frame = requestAnimationFrame(tick);
    }
  }
  function resize() {
    const bounds = hero.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    small = width <= 700;
    anchor = small
      ? { x: width * 0.27 + 79, y: height * 0.5 - 40 }
      : { x: Math.max(200, width * 0.2), y: height * 0.32 };
    trajectories = null;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    draw();
  }
  function play(clientX, clientY, startup = false) {
    const bounds = hero.getBoundingClientRect();
    const px = Math.max(0, Math.min(width, clientX - bounds.left));
    const py = Math.max(0, Math.min(height, clientY - bounds.top));
    if (!startup) paletteIndex = (paletteIndex + 1) % colors.length;
    hero.style.setProperty("--accent", colors[paletteIndex]);
    header.style.setProperty("--accent", colors[paletteIndex]);
    marker.style.transform = `translate(${px - 4}px, ${py - 4}px)`;
    burst = reduceMotion.matches
      ? null
      : { x: px, y: py, started: clock, fromStrength: effectStrength };
    [ring, disc, moon].forEach((button) =>
      button.setAttribute("aria-pressed", String(Boolean(burst))),
    );
    draw();
    wake();
  }
  hero.addEventListener(
    "click",
    (event) => {
      if (event.target.closest("a")) return;
      if (event.detail === 0 && event.target.closest(".orbit button")) {
        const bounds = event.target.getBoundingClientRect();
        play(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      } else play(event.clientX, event.clientY);
    },
    { signal },
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        burst = null;
        [ring, disc, moon].forEach((button) =>
          button.setAttribute("aria-pressed", "false"),
        );
        draw();
      }
    },
    { signal },
  );
  const api = {
    setPaused(value) {
      paused = value;
      if (paused && frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      } else wake();
    },
    destroy() {
      controller.abort();
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      svg.remove();
      marker.remove();
      orbit.classList.remove("orbit-live");
      [ring, disc, moon].forEach((button) =>
        button.setAttribute("aria-pressed", "false"),
      );
    },
  };
  reduceMotion.addEventListener(
    "change",
    () => {
      burst = null;
      effectStrength = 0;
      [ring, disc, moon].forEach((button) =>
        button.setAttribute("aria-pressed", "false"),
      );
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      draw();
      wake();
    },
    { signal },
  );
  const observer = new ResizeObserver(resize);
  observer.observe(hero);
  resize();
  const bounds = hero.getBoundingClientRect();
  play(
    bounds.left + anchor.x - (small ? 90 : 220),
    bounds.top + anchor.y - 90,
    true,
  );
  return api;
}
