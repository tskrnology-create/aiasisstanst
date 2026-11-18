import AuthGate from "@/components/AuthGate";
import PageHeader from "@/components/PageHeader";
import Calendar from "@/components/Calendar";
import { Tag } from "@/components/Ui";
import { IconSend } from "@/components/Icons";

export const metadata = { title: "İçerik takvimi" };

export default function CalendarPage() {
  return (
    <>
      <PageHeader
        eyebrow="Content Calendar"
        title="İçerik takvimi"
        description="Hangi gün ne paylaşacağınızı planlayın. Taslak ve onaylı içerikleri takvime ekleyin, paylaşım zamanı gelince hatırlatma görün."
        actions={
          <Tag>
            <IconSend className="h-3 w-3" />
            Paylaşımlar manuel
          </Tag>
        }
      />
      <AuthGate>
        <Calendar />
      </AuthGate>
    </>
  );
}
