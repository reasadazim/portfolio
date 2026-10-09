import { useEffect, useRef, useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 701px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointerDown = (event) => {
      if (!headerRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  return (
    <header
      ref={headerRef}
      className={`header flex items-center justify-between${menuOpen ? " menu-open" : ""}`}
    >
      <a
        className="wordmark"
        href="#top"
        aria-label="Reasad Azim home"
        onClick={() => setMenuOpen(false)}
      >
        reasad<span>●</span>
      </a>
      <button
        ref={toggleRef}
        className="menu-toggle"
        type="button"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        aria-controls="main-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
      <nav
        id="main-navigation"
        className="hero-nav flex items-center gap-[32px]"
        aria-label="Main navigation"
        onClick={(event) => {
          if (event.target.closest("a")) setMenuOpen(false);
        }}
      >
        <a href="#about">About</a>
        <a href="#services">Services</a>
        <a href="#projects">Projects</a>
        <a href="#expertise">Expertise</a>
        <a href="#contact">
          Let’s talk <span aria-hidden="true">↗</span>
        </a>
      </nav>
    </header>
  );
}
