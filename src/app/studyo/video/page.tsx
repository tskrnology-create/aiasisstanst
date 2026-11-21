import { Suspense } from "react";
import AuthGate from "@/components/AuthGate";
import PageHeader from "@/components/PageHeader";
import { VideoStudio } from "@/components/StudioModes";

export const metadata = { title: "Video" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Stüdyo" title="Video" description="Görsel ve metinle yapay zekâ videosu, kendi videonuz ya da senaryo." />
      <AuthGate>
        <Suspense fallback={null}>
          <VideoStudio />
        </Suspense>
      </AuthGate>
    </>
  );
}
