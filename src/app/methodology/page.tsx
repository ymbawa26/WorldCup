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
    </ContentPage>
  );
}
