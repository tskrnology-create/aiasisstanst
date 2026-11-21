import { Suspense } from "react";
import AuthGate from "@/components/AuthGate";
import Assistant from "@/components/Assistant";

export const metadata = { title: "Asistan" };

export default function Home() {
  return (
    <AuthGate>
      <Suspense fallback={null}>
        <Assistant />
      </Suspense>
    </AuthGate>
  );
}
