// TRENIX — luxury motion layer. Pure DOM, zero dependencies, no impact on app logic.
const REVEAL_SELECTORS = [
  ".tnx-section-heading", ".tnx-shop-heading", ".tnx-filters", ".tnx-collection-card",
  ".tnx-product-card", ".tnx-manifest > *", ".tnx-story-title", ".tnx-story-copy",
  ".tnx-story-footer", ".tnx-final-cta > *", ".tnx-footer-main",
].join(",");

export function initFX(): () => void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const cleanups: Array<() => void> = [];

  // ---- Scroll reveal (also catches products rendered later) ----
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }),
    { threshold: 0.1, rootMargin: "0px 0px -5% 0px" }
  );
  const seen = new WeakSet<Element>(); // per-run: safe under React StrictMode re-runs
  const scan = () => {
    document.querySelectorAll<HTMLElement>(REVEAL_SELECTORS).forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      if (reduce) { el.classList.add("is-in"); return; }
      if (el.classList.contains("is-in")) return;
      const sibs = el.parentElement ? Array.from(el.parentElement.children) : [];
      el.style.setProperty("--d", `${Math.min(sibs.indexOf(el), 5) * 120}ms`);
      el.classList.add("fx-reveal");
      io.observe(el);
    });
  };
  scan();
  const mo = new MutationObserver(scan);
  mo.observe(document.body, { childList: true, subtree: true });
  cleanups.push(() => { io.disconnect(); mo.disconnect(); });

  // ---- Scroll progress + header state ----
  const bar = document.querySelector<HTMLElement>(".tnx-progress");
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      document.querySelector(".tnx-header")?.classList.toggle("is-scrolled", scrollY > 60);
      ticking = false;
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  cleanups.push(() => removeEventListener("scroll", onScroll));

  if (!reduce && fine) {
    // ---- Ring cursor (smoothed, grows over interactive elements) ----
    const ring = document.querySelector<HTMLElement>(".tnx-cursor");
    let tx = innerWidth / 2, ty = innerHeight / 2, cx = tx, cy = ty, raf = 0;
    const loop = () => {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      if (ring) ring.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    loop();

    const onMove = (e: MouseEvent) => {
      tx = e.clientX; ty = e.clientY;
      ring?.classList.add("is-on");
      const t = e.target as HTMLElement;
      ring?.classList.toggle("is-hover", !!t.closest("a, button, input, .tnx-product-card"));

      // spotlight vars for collection cards
      const col = t.closest<HTMLElement>(".tnx-collection-card");
      if (col) {
        const r = col.getBoundingClientRect();
        col.style.setProperty("--mx", `${e.clientX - r.left}px`);
        col.style.setProperty("--my", `${e.clientY - r.top}px`);
      }

      // product image parallax (relative to card)
      const card = t.closest<HTMLElement>(".tnx-product-card");
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--ix", String(((e.clientX - r.left) / r.width - 0.5) * -2));
        card.style.setProperty("--iy", String(((e.clientY - r.top) / r.height - 0.5) * -2));
      }

      // hero parallax
      const hero = document.querySelector<HTMLElement>(".tnx-hero-visual");
      if (hero) {
        hero.style.setProperty("--px", String((e.clientX / innerWidth - 0.5) * 2));
        hero.style.setProperty("--py", String((e.clientY / innerHeight - 0.5) * 2));
      }

      // magnetic buttons
      document.querySelectorAll<HTMLElement>(".tnx-button-primary, .tnx-cta-circle").forEach((b) => {
        const r = b.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const near = Math.hypot(dx, dy) < Math.max(r.width, r.height) * 0.8;
        b.style.transform = near ? `translate(${dx * 0.2}px, ${dy * 0.28}px)` : "";
      });
    };
    const onLeaveDoc = () => ring?.classList.remove("is-on");
    addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeaveDoc);
    cleanups.push(() => {
      cancelAnimationFrame(raf);
      removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeaveDoc);
    });
  }

  return () => cleanups.forEach((fn) => fn());
}
