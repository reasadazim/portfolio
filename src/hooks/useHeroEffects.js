import { useLayoutEffect } from "react";
import { initPortraitDepth } from "../animations/portrait-depth";
import { initOrbits } from "../animations/orbits";
import { initHero } from "../animations/hero";

export function useHeroEffects(heroRef) {
  useLayoutEffect(() => {
    const hero = heroRef.current;
    const header = document.querySelector(".header");
    const portrait = initPortraitDepth(hero.querySelector(".portrait"));
    const orbits = initOrbits(hero, header);
    const destroyHero = initHero(hero, header, portrait, orbits);

    return () => {
      destroyHero();
      orbits.destroy();
      portrait.destroy();
    };
  }, [heroRef]);
}
