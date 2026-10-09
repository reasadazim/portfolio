export function initHero(hero, fixedHeader, portrait, orbits) {
  const controller = new AbortController();
  const { signal } = controller;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let targetX = 0,
    targetY = 0,
    x = 0,
    y = 0,
    frame;
  function animate() {
    x += (targetX - x) * 0.07;
    y += (targetY - y) * 0.07;
    hero.style.setProperty("--motion-x", `${x.toFixed(2)}px`);
    hero.style.setProperty("--motion-y", `${y.toFixed(2)}px`);
    portrait.render(x / 7, y / 5);
    if (Math.abs(targetX - x) + Math.abs(targetY - y) > 0.03)
      frame = requestAnimationFrame(animate);
    else frame = null;
  }
  hero.addEventListener(
    "pointermove",
    (event) => {
      if (motion.matches || event.pointerType === "touch") return;
      targetX = (event.clientX / window.innerWidth - 0.5) * 14;
      targetY = (event.clientY / window.innerHeight - 0.5) * 10;
      if (!frame) frame = requestAnimationFrame(animate);
    },
    { signal },
  );
  hero.addEventListener(
    "pointerleave",
    () => {
      targetX = targetY = 0;
      if (!frame) frame = requestAnimationFrame(animate);
    },
    { signal },
  );
  motion.addEventListener(
    "change",
    () => {
      if (frame) cancelAnimationFrame(frame);
      frame = null;
      targetX = targetY = x = y = 0;
      hero.style.setProperty("--motion-x", "0px");
      hero.style.setProperty("--motion-y", "0px");
      portrait.render(0, 0);
    },
    { signal },
  );
  // Pause ambient motion when the hero is offscreen or the tab is hidden.
  let heroVisible = true;
  function updatePlayback() {
    hero.classList.toggle("is-paused", document.hidden || !heroVisible);
    orbits.setPaused(document.hidden || !heroVisible);
  }
  document.addEventListener("visibilitychange", updatePlayback, { signal });
  let observer;
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      updatePlayback();
    });
    observer.observe(hero);
  }
  updatePlayback();

  // Fade the hero footer over the first 160px of scrolling; restore it on return.
  const heroFooter = hero.querySelector(".footer");
  let footerFrame = null;
  function updateHeroFooter() {
    footerFrame = null;
    const scrolled = Math.max(0, -hero.getBoundingClientRect().top);
    fixedHeader.classList.toggle("is-scrolled", scrolled > 24);
    const opacity = Math.max(0, 1 - scrolled / 160);
    heroFooter.style.opacity = opacity.toFixed(3);
    heroFooter.inert = opacity === 0;
    heroFooter.setAttribute("aria-hidden", String(opacity === 0));
  }
  window.addEventListener(
    "scroll",
    () => {
      if (footerFrame === null)
        footerFrame = requestAnimationFrame(updateHeroFooter);
    },
    { passive: true, signal },
  );
  updateHeroFooter();
  return () => {
    controller.abort();
    observer?.disconnect();
    if (frame) cancelAnimationFrame(frame);
    if (footerFrame !== null) cancelAnimationFrame(footerFrame);
  };
}
