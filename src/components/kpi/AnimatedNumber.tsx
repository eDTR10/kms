import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  formatter?: (n: number) => string;
  /** How long the digit-roll flicker plays before landing on the real number, in ms. */
  scrambleMs?: number;
}

const defaultFormatter = (n: number) => Math.round(n).toLocaleString("en-US");

/** One character position — slides the old glyph out and the new one in, odometer-style. */
function RollingChar({ char }: { char: string }) {
  return (
    <span className="relative inline-block overflow-hidden" style={{ height: "1em" }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={char}
          className="inline-block"
          initial={{ y: "0.7em", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-0.7em", opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * Rolling-digit reveal: flickers through random values for ~1s — each digit
 * sliding in/out of its own column, odometer-style — then lands on the real
 * number. Replays whenever `value` changes (e.g. a period filter swaps in a
 * new total).
 */
export default function AnimatedNumber({
  value,
  formatter = defaultFormatter,
  scrambleMs = 1000,
}: AnimatedNumberProps) {
  // Kept in a ref (not a dependency) so a fresh inline `formatter` prop on
  // every parent render can't restart — or starve — the scramble timer.
  const formatterRef = useRef(formatter);
  formatterRef.current = formatter;

  const [text, setText] = useState(() => formatter(value));

  useEffect(() => {
    // Scramble across the target's full digit range (target "2" flickers
    // through 0-9, target "669" through 0-999) so it reads as a wall of
    // random digits, not a tight jitter around the real value.
    const digitCount = Math.max(1, Math.round(Math.abs(value)).toString().length);
    const scrambleMax = 10 ** digitCount - 1;

    const scrambleTimer = setInterval(() => {
      const random = Math.floor(Math.random() * (scrambleMax + 1));
      setText(formatterRef.current(random));
    }, 80);

    const revealTimer = setTimeout(() => {
      clearInterval(scrambleTimer);
      setText(formatterRef.current(value));
    }, scrambleMs);

    return () => {
      clearInterval(scrambleTimer);
      clearTimeout(revealTimer);
    };
  }, [value, scrambleMs]);

  return (
    <span>
      <span className="inline-flex" aria-hidden="true">
        {text.split("").map((char, i) => (
          <RollingChar key={i} char={char} />
        ))}
      </span>
      <span className="sr-only">{formatterRef.current(value)}</span>
    </span>
  );
}
