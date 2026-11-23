import AuthGate from "@/components/AuthGate";
import PageHeader from "@/components/PageHeader";
import { ReplyStudio } from "@/components/StudioModes";

export const metadata = { title: "Yanıtla" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Stüdyo" title="Yanıtla" description="Yorum ve mesajlara marka sesiyle hızlı yanıt hazırlayın." />
      <AuthGate>
        <ReplyStudio />
      </AuthGate>
    </>
  );
}
