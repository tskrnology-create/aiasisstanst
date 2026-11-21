import AuthGate from "@/components/AuthGate";
import Week from "@/components/Week";

export const metadata = { title: "Hafta" };

export default function WeekPage() {
  return (
    <AuthGate>
      <Week />
    </AuthGate>
  );
}
