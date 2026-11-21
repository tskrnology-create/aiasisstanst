import { Suspense } from "react";
import AuthGate from "@/components/AuthGate";
import PageHeader from "@/components/PageHeader";
import { ImageStudio } from "@/components/StudioModes";

export const metadata = { title: "Görsel" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Stüdyo" title="Görsel" description="Yalnızca görsel: fotoğrafı üretin, yükleyin ya da Pixabay'dan seçin; şablona yerleştirin." />
      <AuthGate>
        <Suspense fallback={null}>
          <ImageStudio />
        </Suspense>
      </AuthGate>
    </>
  );
}
