import { Suspense } from "react";
import AuthGate from "@/components/AuthGate";
import PageHeader from "@/components/PageHeader";
import Studio from "@/components/Studio";

export const metadata = { title: "Stüdyo" };

export default function StudioPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stüdyo"
        title="Bir içerik, baştan sona"
        description="Fikrinizi yazın; metni, görseli ve paylaşım gününü aynı yerde hazırlayın. Paylaşım sosyal platformda sizin tarafınızdan yapılır."
      />
      <AuthGate>
        <Suspense fallback={null}>
          <Studio />
        </Suspense>
      </AuthGate>
    </>
  );
}
