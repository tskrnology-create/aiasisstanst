import AuthGate from "@/components/AuthGate";
import PageHeader from "@/components/PageHeader";
import ProfileForm from "@/components/ProfileForm";
import VoicePanel from "@/components/VoicePanel";
import { Tag } from "@/components/Ui";
import { IconCheck } from "@/components/Icons";

export const metadata = { title: "Marka ve sosyal hesaplar" };

export default function BrandPage() {
  return (
    <>
      <PageHeader
        eyebrow="Marka ayarları"
        title="İşletmenizi tanıtın"
        description="Yapay zekâ marka bilgilerinizi içeriklerde kullanır. Ürün, hedef kitle, marka renkleri ve sosyal hesapları istediğiniz zaman güncelleyebilirsiniz."
        actions={
          <Tag tone="brand">
            <IconCheck className="h-3 w-3" />
            Her içerikte kullanılır
          </Tag>
        }
      />
      <AuthGate>
        <div className="space-y-6">
          <ProfileForm />
          <VoicePanel />
        </div>
      </AuthGate>
    </>
  );
}
