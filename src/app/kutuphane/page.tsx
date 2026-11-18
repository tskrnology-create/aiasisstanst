import AuthGate from "@/components/AuthGate";
import PageHeader from "@/components/PageHeader";
import Library from "@/components/Library";

export const metadata = { title: "İçerik kütüphanesi" };

export default function LibraryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Content Library"
        title="İçerik kütüphanesi"
        description="Ürettiğiniz tüm içerikler burada saklanır. Bulun, düzenleyin, onaylayın, paylaşmak için kopyalayın veya yeniden kullanın."
      />
      <AuthGate>
        <Library />
      </AuthGate>
    </>
  );
}
