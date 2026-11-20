import AuthGate from "@/components/AuthGate";
import Dashboard from "@/components/Dashboard";

export const metadata = { title: "İşletme paneli" };

export default function Home() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}
