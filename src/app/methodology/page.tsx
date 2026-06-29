import { FlaskConical } from "lucide-react";

import { ContentPage } from "@/components/content-page";

const principles = [
  {
    title: "Source before inference",
    copy: "Tournament facts and squad membership require authoritative sources. Derived values retain provenance, retrieval date, confidence, and estimation status.",
  },
  {
    title: "Events before summaries",
    copy: "Scores, possession, expected goals, cards, and player ratings will all aggregate from one chronological match event log.",
  },
  {
    title: "Models before presentation",
    copy: "The headless simulation and probability engines must pass deterministic and property-based tests before match animation is added.",
  },
];

const analysisSections = [
  {
    title: "Data analysis layer",
    copy: "The model starts by normalizing team strength, FIFA ranking signal, roster depth, tactical role coverage, formation fit, and uncertainty. Each match is treated as a paired comparison rather than a flat coin flip.",
  },
  {
    title: "Probability engine",
    copy: "Outcome probabilities are produced from attack, midfield, defense, goalkeeping, set-piece, depth, and confidence features, then converted into a score matrix so strong teams win more often without becoming deterministic.",
  },
  {
    title: "Interpretability layer",
    copy: "The game can explain a result with feature attribution language: chance quality, possession pressure, fatigue, tactical risk, transition exposure, and knockout variance.",
  },
];

const equations = [
  {
    name: "Latent team quality",
    formula:
      "Q_t = β₀ + β₁A_t + β₂M_t + β₃D_t + β₄G_t + β₅S_t + β₆Depth_t + β₇Rank_t − β₈Uncertainty_t",
    example:
      "Brazil vs Qatar: Brazil’s attacking and depth terms lift Q_t before randomness is applied, so the favorite starts with a larger latent edge.",
  },
  {
    name: "Matchup differential",
    formula:
      "ΔQ = (Q_home − Q_away) + H + Φ(formation_home, formation_away) + Ψ(tactics) − Ω(fatigue, injuries)",
    example:
      "A high-press setup can improve territory while fatigue pulls the same team back late in the tournament.",
  },
  {
    name: "Softmax outcome transform",
    formula: "P(home, draw, away) = softmax([αΔQ, γ − |ΔQ|, −αΔQ])",
    example:
      "When two teams are close, the draw logit stays competitive. When ΔQ is large, the stronger side’s win probability expands.",
  },
  {
    name: "Scoreline likelihood",
    formula:
      "P(x,y) = Pois(x; λ_home) · Pois(y; λ_away), with λ adjusted by tempo, chance quality, possession, cards, and game state",
    example:
      "A possession-heavy favorite may raise shot volume, but a compact counter side can still produce a narrow upset.",
  },
  {
    name: "Knockout variance",
    formula:
      "P(advance) = P(win in 90/120) + P(draw) · P(extra-time/penalty resolution)",
    example:
      "A 1–1 knockout match can still send one team through on penalties even if the pre-match model preferred the opponent.",
  },
];

export default function MethodologyPage() {
  return (
    <ContentPage
      eyebrow="Transparent by design"
      icon={FlaskConical}
      intro="This page will become the public audit trail for data sources, estimated attributes, rating formulas, simulation parameters, calibration targets, and known limitations."
      title="A model you can interrogate."
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
          From football signals to match probabilities
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
          These equations describe the model frame and interpretability layer.
          The production engine uses the same principle: weighted team strength,
          tactical adjustment, calibrated outcome probabilities, and stochastic
          scoreline sampling.
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
