"use client";

import { useEffect } from "react";
import { Check } from "@phosphor-icons/react";
import type { Quest } from "@/lib/types";

// Completing a quest is final (it locks in XP), so it always asks first.
export default function ConfirmDone({ quest, onConfirm, onCancel }: { quest: Quest; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-ink/55 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="confirm-done-title" className="card rise w-full max-w-md p-5 shadow-2xl sm:p-6">
        <p className="eyebrow">Complete quest</p>
        <h2 id="confirm-done-title" className="mt-1 text-xl font-semibold leading-snug tracking-tight">{quest.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Did you actually finish this? You&apos;ll earn <span className="game font-semibold text-gold">+{quest.xp} XP</span>, and it can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-quiet" onClick={onCancel}>Not yet</button>
          <button className="btn btn-primary" onClick={onConfirm} autoFocus>
            <Check size={16} weight="bold" /> Yes, I did it
          </button>
        </div>
      </section>
    </div>
  );
}
