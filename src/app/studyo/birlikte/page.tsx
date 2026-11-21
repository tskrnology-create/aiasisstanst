import { Suspense } from "react";
import AuthGate from "@/components/AuthGate";
import PageHeader from "@/components/PageHeader";
import Studio from "@/components/Studio";

export const metadata = { title: "Metin + Görsel" };

export default function StudioPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stüdyo"
        title="Metin + Görsel"
        description="Metni, görseli ve paylaşım gününü tek akışta hazırlayın. Paylaşım sosyal platformda sizin tarafınızdan yapılır."
      />
      <AuthGate>
        <Suspense fallback={null}>
          <Studio />
        </Suspense>
      </AuthGate>
    </>
  );
}
