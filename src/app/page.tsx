import AuthGate from "@/components/AuthGate";
import Dashboard from "@/components/Dashboard";

export const metadata = { title: "Panel" };

export default function Home() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}
