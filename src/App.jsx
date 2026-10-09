import { useLayoutEffect, useRef } from "react";
import { useSectionMotion } from "./hooks/useSectionMotion";
import Header from "./components/Header";
import Hero from "./components/Hero";
import About from "./components/About";
import Services from "./components/Services";
import Projects from "./components/Projects";
import Expertise from "./components/Expertise";
import Process from "./components/Process";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import Assistant from "./components/Assistant";

export default function App() {
  const mainRef = useRef(null);
  useSectionMotion(mainRef);
  useLayoutEffect(() => {
    // Hash targets appear after React mounts; retain direct section links.
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(
        decodeURIComponent(window.location.hash.slice(1)),
      );
      target?.scrollIntoView({ behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <a className="skip-link" href="#about">
        Skip to content
      </a>
      <Header />
      <main ref={mainRef}>
        <Hero />
        <About />
        <Services />
        <Projects />
        <Expertise />
        <Process />
        <Contact />
      </main>
      <Footer />
      <Assistant />
    </>
  );
}
