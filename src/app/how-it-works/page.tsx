import { ListChecks } from "lucide-react";

import { ContentPage } from "@/components/content-page";

const steps = [
  ["Choose a nation", "Start from the tournament state."],
  ["Build the match plan", "Set the formation, tactics, and set-piece roles."],
  ["Manage the match", "Adjust the plan and make substitutions."],
  [
    "Navigate the tournament",
    "Track tables, qualification, and the knockout bracket.",
  ],
];

export default function HowItWorksPage() {
  return (
    <ContentPage
      eyebrow="The management loop"
      icon={ListChecks}
      intro="World Stage is a tournament management loop built around tradeoffs, probability, and match state."
      title="Make the plan. Read the result."
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
