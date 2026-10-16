"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
export function LocalityDisclosure({
  summary,
  title,
  closeLabel,
  items,
  locale,
  categorySlug,
}) {
  const [open, setOpen] = useState(false),
    trigger = useRef(null),
    panel = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow,
      opener = trigger.current;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector("button")?.focus();
    const key = (event) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab") {
        const nodes = [...panel.current.querySelectorAll("button, a")],
          first = nodes[0],
          last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previous;
      removeEventListener("keydown", key);
      opener?.focus();
    };
  }, [open]);
  return (
    <div className="locality-disclosure">
      <p>{summary}</p>
      <button
        ref={trigger}
        className="info-button"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span>{title}</span>
      </button>
      {open && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setOpen(false)
          }
        >
          <section
            ref={panel}
            className="locality-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="locality-dialog-title"
          >
            <header>
              <h2 id="locality-dialog-title">{title}</h2>
              <button
                className="icon-button"
                type="button"
                aria-label={closeLabel}
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>
            <div className="locality-dialog__grid">
              {items.map((item) =>
                categorySlug ? (
                  <Link
                    key={item.slug}
                    onClick={() => setOpen(false)}
                    href={`/${locale}/services/${categorySlug}/${item.slug}`}
                  >
                    {item.name}
                  </Link>
                ) : (
                  <span key={item.slug}>{item.name}</span>
                ),
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
