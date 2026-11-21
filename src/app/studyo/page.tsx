import AuthGate from "@/components/AuthGate";
import PageHeader from "@/components/PageHeader";
import { StudioHub } from "@/components/StudioModes";

export const metadata = { title: "Stüdyo" };

export default function StudioHubPage() {
  return (
    <>
      <PageHeader eyebrow="Stüdyo" title="Ne hazırlayalım?" />
      <AuthGate>
        <StudioHub />
      </AuthGate>
    </>
  );
}
