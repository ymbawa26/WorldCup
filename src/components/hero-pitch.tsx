"use client";

import { motion, useReducedMotion } from "framer-motion";

const homeShape = [
  [50, 86],
  [18, 68],
  [40, 66],
  [60, 66],
  [82, 68],
  [28, 43],
  [50, 48],
  [72, 43],
  [18, 23],
  [50, 18],
  [82, 23],
];

const awayShape = homeShape.map(([x, y]) => [100 - x, 100 - y]);

export function HeroPitch() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      aria-label="Abstract tactical football pitch showing two formations"
      className="relative mx-auto aspect-[4/5] w-full max-w-[470px] overflow-hidden rounded-[2rem] border border-cyan-200/20 bg-[#071e34] shadow-[0_35px_100px_rgba(0,0,0,0.45)]"
      role="img"
    >
      <div className="pitch-grid absolute inset-0 opacity-70" />
      <div className="absolute inset-x-[8%] inset-y-[5%] rounded-2xl border border-white/25">
        <div className="absolute top-1/2 left-0 h-1/3 w-[18%] -translate-y-1/2 border border-l-0 border-white/20" />
        <div className="absolute top-1/2 right-0 h-1/3 w-[18%] -translate-y-1/2 border border-r-0 border-white/20" />
        <div className="absolute top-1/2 left-0 h-[14%] w-[7%] -translate-y-1/2 border border-l-0 border-white/20" />
        <div className="absolute top-1/2 right-0 h-[14%] w-[7%] -translate-y-1/2 border border-r-0 border-white/20" />
        <div className="absolute top-1/2 left-1/2 aspect-square w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
        <div className="absolute top-1/2 left-1/2 h-full w-px -translate-x-1/2 -translate-y-1/2 bg-white/25" />
      </div>

      {[...homeShape, ...awayShape].map(([x, y], index) => {
        const isHome = index < homeShape.length;
        return (
          <motion.span
            animate={
              prefersReducedMotion
                ? undefined
                : { x: [0, isHome ? 3 : -3, 0], y: [0, -2, 0] }
            }
            className={`absolute grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-[0.5rem] font-black shadow-lg ${
              isHome
                ? "border-cyan-100 bg-cyan-300 text-[#061022]"
                : "border-fuchsia-200 bg-fuchsia-500 text-white"
            }`}
            key={`${x}-${y}-${index}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            transition={{
              delay: index * 0.04,
              duration: 3 + (index % 4) * 0.4,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          >
            {index % 11 || 11}
          </motion.span>
        );
      })}

      <motion.span
        animate={
          prefersReducedMotion
            ? undefined
            : { x: [0, 30, -12, 0], y: [0, -22, 18, 0] }
        }
        className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-300 bg-white shadow-[0_0_14px_rgba(255,255,255,0.9)]"
        transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
      />

      <div className="absolute top-6 left-6 rounded-full border border-white/10 bg-[#050819]/70 px-3 py-1.5 text-[0.65rem] font-bold tracking-[0.16em] text-cyan-200 uppercase backdrop-blur">
        Live tactical shape
      </div>
      <div className="absolute right-5 bottom-5 left-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-[#050819]/80 p-3 backdrop-blur">
        {[
          ["Control", "54%"],
          ["Threat", "1.42"],
          ["Press", "High"],
        ].map(([label, value]) => (
          <div className="text-center" key={label}>
            <p className="text-[0.58rem] tracking-[0.16em] text-slate-400 uppercase">
              {label}
            </p>
            <p className="mt-1 text-sm font-bold text-white">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
