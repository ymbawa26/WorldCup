import { CircleOff } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="grid min-h-[65vh] place-items-center px-5 py-16 text-center">
      <div>
        <CircleOff
          aria-hidden="true"
          className="mx-auto size-10 text-cyan-300"
        />
        <p className="eyebrow mt-6">Outside the touchline</p>
        <h1 className="mt-3 text-4xl font-black text-white">
          That route is not in play.
        </h1>
        <p className="mt-4 text-slate-400">
          Return to the tournament foundation.
        </p>
        <Button asChild className="mt-8">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
