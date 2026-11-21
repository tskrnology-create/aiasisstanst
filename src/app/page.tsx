import AuthGate from "@/components/AuthGate";
import Home from "@/components/Home";

export const metadata = { title: "Ana sayfa" };

export default function HomePage() {
  return (
    <AuthGate>
      <Home />
    </AuthGate>
  );
}
