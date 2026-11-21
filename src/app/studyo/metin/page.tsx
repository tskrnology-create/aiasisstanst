import { Suspense } from "react";
import AuthGate from "@/components/AuthGate";
import PageHeader from "@/components/PageHeader";
import { TextStudio } from "@/components/StudioModes";

export const metadata = { title: "Metin" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Stüdyo" title="Metin" description="Yalnızca metin: yapay zekâyla yazın ya da kendi metninizi ekleyin." />
      <AuthGate>
        <Suspense fallback={null}>
          <TextStudio />
        </Suspense>
      </AuthGate>
    </>
  );
}
