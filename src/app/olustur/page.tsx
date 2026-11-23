import { Suspense } from "react";
import AuthGate from "@/components/AuthGate";
import Create from "@/components/Create";

export const metadata = { title: "Oluştur" };

export default function CreatePage() {
  return (
    <AuthGate>
      <Suspense fallback={null}>
        <Create />
      </Suspense>
    </AuthGate>
  );
}
