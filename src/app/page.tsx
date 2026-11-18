import AuthGate from "@/components/AuthGate";
import PageHeader from "@/components/PageHeader";
import ProfileForm from "@/components/ProfileForm";
import { Tag } from "@/components/Ui";
import { IconCheck } from "@/components/Icons";

export const metadata = { title: "Marka profili" };

export default function Home() {
  return (
    <>
      <PageHeader
        eyebrow="Adım 1 · Business Profile"
        title="İşletmenizi tanıtın"
        description="Yapay zekâ bu bilgileri sonraki bütün içeriklerde kullanır. Daha sonra istediğiniz zaman değiştirebilirsiniz."
        actions={
          <Tag tone="brand">
            <IconCheck className="h-3 w-3" />
            Her içerikte otomatik kullanılır
          </Tag>
        }
      />
      <AuthGate>
        <ProfileForm />
      </AuthGate>
    </>
  );
}
