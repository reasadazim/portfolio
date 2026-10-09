import { useLayoutEffect } from "react";

// Only lower-page content is selected; the hero and fixed header keep their own motion.
const revealSelector = [
  ".section-pad > .section-top",
  ".section-pad > .section-heading",
  ".about-layout > *",
  ".about-bottom",
  ".upwork-highlights",
  ".service-row",
  ".services-section > .text-link",
  ".project-card",
  ".projects-bottom",
  ".expertise-layout > div:first-child",
  ".stack-group",
  ".process-grid > article",
  ".contact-section > h2",
  ".contact-bottom",
  ".email-row",
].join(",");

export function useSectionMotion(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const elements = Array.from(root.querySelectorAll(revealSelector));
    const targets = new Set(elements);
    let observer;

    const reveal = (element, immediately = false) => {
      if (immediately) element.style.setProperty("--reveal-delay", "0ms");
      element.classList.add("is-revealed");
      observer?.unobserve(element);
    };
    const reset = () => {
      observer?.disconnect();
      elements.forEach((element) => {
        element.classList.remove("section-reveal", "is-revealed");
        element.style.removeProperty("--reveal-delay");
      });
    };
    const initialize = () => {
      reset();
      if (motion.matches) return;
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) reveal(entry.target);
          });
        },
        { threshold: 0.06, rootMargin: "0px 0px -24px 0px" },
      );
      elements.forEach((element) => {
        // Short sibling delays create a soft stagger without holding up scrolling.
        const siblings = Array.from(element.parentElement.children).filter(
          (sibling) => targets.has(sibling),
        );
        const delay = Math.min(siblings.indexOf(element) * 55, 165);
        element.style.setProperty("--reveal-delay", `${delay}ms`);
        element.classList.add("section-reveal");
        if (element.getBoundingClientRect().bottom <= 0) reveal(element, true);
        else observer.observe(element);
      });
    };
    const onFocus = (event) => {
      const element = event.target.closest(".section-reveal");
      if (element && root.contains(element)) reveal(element, true);
    };
    initialize();
    motion.addEventListener("change", initialize);
    root.addEventListener("focusin", onFocus);
    return () => {
      reset();
      motion.removeEventListener("change", initialize);
      root.removeEventListener("focusin", onFocus);
    };
  }, [rootRef]);
}
