import AuthGate from "@/components/AuthGate";
import PageHeader from "@/components/PageHeader";
import VisualCreator from "@/components/VisualCreator";

export const metadata = { title: "Görsel stüdyosu" };

export default function VisualPage() {
  return (
    <>
      <PageHeader
        eyebrow="Adım 3 · AI Visual Creator"
        title="Görsel oluşturun"
        description="İçeriğinizi marka renkleriniz ve logonuzla gönderi, hikâye veya kampanya görseline dönüştürün. İsterseniz yapay zekâyla arka plan üretin."
      />
      <AuthGate>
        <VisualCreator />
      </AuthGate>
    </>
  );
}
