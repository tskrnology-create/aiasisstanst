import AuthGate from "@/components/AuthGate";
import PageHeader from "@/components/PageHeader";
import Generator from "@/components/Generator";

export const metadata = { title: "İçerik üret" };

export default function GeneratePage() {
  return (
    <>
      <PageHeader
        eyebrow="Adım 2 · AI Content Generator"
        title="İçerik üretin"
        description="İsteğinizi yazın; yapay zekâ işletme profilinizdeki marka diline göre gönderi, açıklama, hashtag, reklam ve hikâye metni hazırlar."
      />
      <AuthGate>
        <Generator />
      </AuthGate>
    </>
  );
}
