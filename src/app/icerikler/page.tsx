import { Suspense } from "react";
import AuthGate from "@/components/AuthGate";
import PageHeader from "@/components/PageHeader";
import ContentsHub from "@/components/ContentsHub";

export const metadata = { title: "İçerikler" };

export default function ContentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="İçerikler"
        title="Tüm içerikleriniz"
        description="Ürettiğiniz içerikleri listeden bulup düzenleyin, takvimde ne zaman paylaşacağınızı planlayın."
      />
      <AuthGate>
        <Suspense fallback={null}>
          <ContentsHub />
        </Suspense>
      </AuthGate>
    </>
  );
}
