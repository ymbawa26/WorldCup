import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  DatabaseZap,
  Gauge,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { HeroPitch } from "@/components/hero-pitch";
import { Button } from "@/components/ui/button";

const foundations = [
  {
    icon: DatabaseZap,
    label: "Verified tournament data",
    copy: "Official structure and source provenance, frozen before opening day.",
  },
  {
    icon: BrainCircuit,
    label: "Decisions, not dice rolls",
    copy: "Lineups, roles, fatigue, and tactical matchups will shape every event.",
  },
  {
    icon: ShieldCheck,
    label: "Reproducible simulation",
    copy: "Versioned models and deterministic seeds make every result explainable.",
  },
];

const modelReadout = [
  ["Teams", "48"],
  ["Groups", "12"],
  ["Matches", "104"],
  ["Engine", "Seeded"],
];

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      <section className="relative isolate border-b border-white/10">
        <div className="hero-glow absolute inset-0 -z-20" />
        <div className="stadium-beams absolute inset-0 -z-10 opacity-60" />
        <div className="mx-auto grid max-w-[1440px] gap-16 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-12 lg:py-24">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-4 py-2 text-xs font-bold tracking-[0.16em] text-cyan-200 uppercase">
              <Sparkles aria-hidden="true" className="size-4" />
              Data-driven tournament management
            </div>

            <h1 className="max-w-4xl text-5xl leading-[0.96] font-black tracking-[-0.055em] text-balance text-white sm:text-6xl lg:text-7xl xl:text-[5.5rem]">
              The world stage.
              <span className="mt-2 block bg-gradient-to-r from-cyan-200 via-sky-400 to-violet-400 bg-clip-text text-transparent">
                Your decisions.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Choose a nation, shape its identity, and navigate every tactical
              decision from opening night to the final. No direct player
              control. No scripted outcomes. Just football systems meeting under
              pressure.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="large">
                <Link href="/play">
                  New tournament
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
              <Button asChild size="large" variant="secondary">
                <Link href="/play">Continue</Link>
              </Button>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Accelerated tournament flow is available. Detailed match-center
              controls arrive in the next phase.
            </p>

            <div className="mt-11 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
              {modelReadout.map(([label, value]) => (
                <div className="bg-[#080d26]/90 px-5 py-4" key={label}>
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="mt-1 text-[0.65rem] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 -z-10 rounded-full bg-violet-500/20 blur-3xl" />
            <HeroPitch />
          </div>
        </div>
      </section>

      <section className="bg-[#070b21] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Built from the model out</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                A football simulation that can show its work.
              </h2>
            </div>
            <Button asChild variant="secondary">
              <Link href="/methodology">
                Explore methodology
                <BarChart3 aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {foundations.map(({ copy, icon: Icon, label }, index) => (
              <article
                className="group rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.025] p-7 transition hover:-translate-y-1 hover:border-cyan-300/30"
                key={label}
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="text-xs font-black text-slate-600">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-8 text-xl font-bold text-white">{label}</h3>
                <p className="mt-3 leading-7 text-slate-400">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#050819] px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1440px] gap-8 rounded-[2rem] border border-violet-300/15 bg-gradient-to-r from-violet-500/10 via-sky-500/5 to-cyan-300/10 p-8 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="eyebrow">Playable core</p>
            <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
              Start a tournament without seeing the machinery.
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-400">
              Internal models, calibration reports, and validation tools stay
              behind the curtain. The player flow focuses on choosing a nation,
              completing the tournament, and managing saves.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] px-5 py-4 text-emerald-200">
            <Gauge aria-hidden="true" className="size-5" />
            <span className="text-sm font-bold">Foundation health: ready</span>
          </div>
        </div>
      </section>
    </div>
  );
}
