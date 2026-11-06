"use client";
// The light/dark switch in the header. By default the site follows the
// computer's setting; clicking this picks the opposite and remembers it.
export default function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const current = root.dataset.theme ?? (systemDark ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // private browsing can block storage; the switch still works for this visit
    }
  }

  return (
    <button type="button" onClick={toggle} aria-label="Switch light or dark mode" className="btn btn-text w-11 px-0">
      {/* A half-filled circle: the usual "contrast" icon. */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
      </svg>
    </button>
  );
}

// Runs in <head> before the page is drawn, so a saved choice doesn't flash.
export const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;
