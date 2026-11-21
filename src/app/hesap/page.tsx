import AuthGate from "@/components/AuthGate";
import AccountPanel from "@/components/AccountPanel";
import PageHeader from "@/components/PageHeader";

export const metadata = { title: "Hesabım" };

export default function AccountPage() {
  return (
    <>
      <PageHeader eyebrow="Hesap" title="Hesabım" description="Giriş bilgileriniz, verileriniz ve hesap silme." />
      <AuthGate>
        <AccountPanel />
      </AuthGate>
    </>
  );
}
