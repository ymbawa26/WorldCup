import { ListChecks } from "lucide-react";

import { ContentPage } from "@/components/content-page";

const steps = [
  ["Choose a nation", "Start from the verified pre-opening tournament state."],
  [
    "Build the match plan",
    "Select eligible players, shape a formation, and assign tactical roles.",
  ],
  [
    "Manage the match",
    "Read the state, change instructions, and make legal substitutions.",
  ],
  [
    "Navigate the tournament",
    "Group tables, third-place qualification, and the official bracket update from simulated events.",
  ],
];

export default function HowItWorksPage() {
  return (
    <ContentPage
      eyebrow="The management loop"
      icon={ListChecks}
      intro="World Stage is about reading tradeoffs rather than steering players. Every choice will feed the same deterministic event engine used by AI-managed teams."
      title="Make the plan. Live with the consequences."
    >
      <ol className="grid gap-4 md:grid-cols-2">
        {steps.map(([title, copy], index) => (
          <li
            className="rounded-3xl border border-white/10 bg-white/[0.045] p-7"
            key={title}
          >
            <span className="text-xs font-black tracking-[0.18em] text-cyan-300 uppercase">
              Step {index + 1}
            </span>
            <h2 className="mt-4 text-xl font-bold text-white">{title}</h2>
            <p className="mt-3 leading-7 text-slate-400">{copy}</p>
          </li>
        ))}
      </ol>
    </ContentPage>
  );
}
