import { FlaskConical } from "lucide-react";

import { ContentPage } from "@/components/content-page";

const principles = [
  {
    title: "Source before inference",
    copy: "Facts come from source data. Estimates stay marked as estimates.",
  },
  {
    title: "Events before summaries",
    copy: "Scores, cards, possession, and ratings are built from match events.",
  },
  {
    title: "Models before presentation",
    copy: "The model is tested before the interface presents it.",
  },
];

const analysisSections = [
  {
    title: "Data analysis layer",
    copy: "Team strength, ranking signal, depth, tactics, and uncertainty are normalized before comparison.",
  },
  {
    title: "Probability model",
    copy: "Outcome probabilities are mapped into a score matrix. Stronger teams gain an edge, not a guarantee.",
  },
  {
    title: "Interpretability layer",
    copy: "Results are explained through chance quality, pressure, fatigue, risk, and variance.",
  },
];

const equations = [
  {
    name: "Latent team quality",
    formula:
      "Q_t = β₀ + β₁A_t + β₂M_t + β₃D_t + β₄G_t + β₅S_t + β₆Depth_t + β₇Rank_t − β₈Uncertainty_t",
    example: "Example: Brazil starts with a larger latent edge than Qatar.",
  },
  {
    name: "Matchup differential",
    formula:
      "ΔQ = (Q_home − Q_away) + H + Φ(formation_home, formation_away) + Ψ(tactics) − Ω(fatigue, injuries)",
    example: "Example: pressing raises territory; fatigue pulls it back.",
  },
  {
    name: "Softmax outcome transform",
    formula: "P(home, draw, away) = softmax([αΔQ, γ − |ΔQ|, −αΔQ])",
    example: "Close teams keep the draw live. Large gaps favor one side.",
  },
  {
    name: "Scoreline likelihood",
    formula:
      "P(x,y) = Pois(x; λ_home) · Pois(y; λ_away), with λ adjusted by tempo, chance quality, possession, cards, and game state",
    example: "Possession raises volume. Counters keep upsets possible.",
  },
  {
    name: "Knockout variance",
    formula:
      "P(advance) = P(win in 90/120) + P(draw) · P(extra-time/penalty resolution)",
    example: "A level knockout match can still turn on penalties.",
  },
];

export default function MethodologyPage() {
  return (
    <ContentPage
      eyebrow="Transparent by design"
      icon={FlaskConical}
      intro="A concise view of the data, assumptions, and probability frame."
      title="Methodology."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {principles.map((principle) => (
          <article
            className="rounded-3xl border border-white/10 bg-white/[0.045] p-7"
            key={principle.title}
          >
            <h2 className="text-lg font-bold text-white">{principle.title}</h2>
            <p className="mt-4 leading-7 text-slate-400">{principle.copy}</p>
          </article>
        ))}
      </div>

      <section className="mt-10">
        <p className="eyebrow">Data analysis</p>
        <h2 className="mt-2 text-3xl font-black text-white">
          From signals to probabilities
        </h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {analysisSections.map((section) => (
            <article
              className="rounded-3xl border border-white/10 bg-white/[0.045] p-7"
              key={section.title}
            >
              <h3 className="text-lg font-bold text-white">{section.title}</h3>
              <p className="mt-4 leading-7 text-slate-400">{section.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <p className="eyebrow">Probability equations</p>
        <h2 className="mt-2 text-3xl font-black text-white">
          The mathematical frame
        </h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-400">
          The system uses weighted strength, tactical adjustment, calibrated
          outcomes, and scoreline sampling.
        </p>
        <div className="mt-5 space-y-4">
          {equations.map((equation) => (
            <article
              className="rounded-3xl border border-cyan-300/15 bg-cyan-300/10 p-6"
              key={equation.name}
            >
              <h3 className="text-lg font-black text-white">{equation.name}</h3>
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-cyan-100">
                {equation.formula}
              </pre>
              <p className="mt-4 leading-7 text-slate-300">
                {equation.example}
              </p>
            </article>
          ))}
        </div>
      </section>
    </ContentPage>
  );
}
