"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { Flashcard } from "@/lib/learning-hub-types";

export interface StudyTabProps {
  flashcards: Flashcard[];
}

export default function StudyTab({ flashcards }: StudyTabProps) {
  const [cards, setCards] = useState(flashcards);
  const [flippedId, setFlippedId] = useState<string | null>(null);

  const masteredCount = useMemo(
    () => cards.filter((c) => c.mastered).length,
    [cards]
  );

  const toggleFlip = (id: string) => {
    setFlippedId((prev) => (prev === id ? null : id));
  };

  const toggleMastered = (id: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, mastered: !c.mastered } : c))
    );
  };

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
          Flashcards
        </h3>
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-dark-elevated">
            <div
              className="h-full rounded-full bg-[#22c55e] transition-all"
              style={{
                width: `${cards.length > 0 ? (masteredCount / cards.length) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="font-mono text-[10px] text-text-muted">
            {masteredCount}/{cards.length} mastered
          </span>
        </div>
      </div>

      {/* Flashcard grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, i) => {
          const isFlipped = flippedId === card.id;

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: i * 0.03 }}
              className="group relative"
              style={{ perspective: "1000px" }}
            >
              <div
                onClick={() => toggleFlip(card.id)}
                className="cursor-pointer"
                style={{
                  transformStyle: "preserve-3d",
                  transition: "transform 0.4s ease",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0)",
                }}
              >
                {/* Front — Question */}
                <div
                  className={`rounded-xl border p-5 min-h-[140px] flex flex-col justify-between ${
                    card.mastered
                      ? "border-[#22c55e]/30 bg-[#22c55e]/5"
                      : "border-dark-border bg-dark-surface"
                  }`}
                  style={{
                    backfaceVisibility: "hidden",
                  }}
                >
                  <div>
                    <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted">
                      {card.hexLabel}
                    </div>
                    <p className="text-xs leading-relaxed text-text-primary">
                      {card.question}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-text-muted">
                      Click to flip
                    </span>
                    {card.mastered && (
                      <span className="text-[9px] font-mono text-[#22c55e]">
                        ✓ Mastered
                      </span>
                    )}
                  </div>
                </div>

                {/* Back — Answer */}
                <div
                  className="absolute inset-0 rounded-xl border border-[#00f0ff]/30 bg-[#00f0ff]/5 p-5 min-h-[140px] flex flex-col justify-between"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <div>
                    <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[#00f0ff]">
                      Answer
                    </div>
                    <p className="text-xs leading-relaxed text-text-primary">
                      {card.answer}
                    </p>
                  </div>
                  <div className="mt-3 text-[9px] font-mono text-text-muted">
                    Click to flip back
                  </div>
                </div>
              </div>

              {/* Mastered toggle (outside the flip area) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMastered(card.id);
                }}
                className={`mt-1.5 w-full rounded-md py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  card.mastered
                    ? "bg-[#22c55e]/15 text-[#22c55e]"
                    : "bg-dark-elevated text-text-muted hover:text-text-secondary"
                }`}
              >
                {card.mastered ? "✓ Mastered" : "Mark as Mastered"}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
