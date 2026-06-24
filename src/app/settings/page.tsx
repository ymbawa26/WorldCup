import { Settings2 } from "lucide-react";

import { ContentPage } from "@/components/content-page";
import { SettingsPanel } from "@/components/settings-panel";

export default function SettingsPage() {
  return (
    <ContentPage
      eyebrow="Interface preferences"
      icon={Settings2}
      intro="A small, accessible preference surface is in place now so future match controls have a stable home."
      title="Tune the touchline."
    >
      <SettingsPanel />
    </ContentPage>
  );
}
