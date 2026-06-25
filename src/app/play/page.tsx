import type { Metadata } from "next";

import { PlayClient } from "./play-client";

export const metadata: Metadata = {
  title: "Play",
  description: "Start, save, and complete an accelerated tournament.",
};

export default function PlayPage() {
  return <PlayClient />;
}
