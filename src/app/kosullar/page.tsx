import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Kullanım Koşulları" };

export default function TermsPage() {
  return (
    <LegalPage title="Kullanım Koşulları" updated="21 Kasım 2026">
      <p>Aı Asisst&apos;i kullanarak aşağıdaki koşulları kabul etmiş olursunuz.</p>
      <h2>Hizmet</h2>
      <p>
        Aı Asisst; marka profili, yapay zekâ ile içerik ve görsel üretimi, takvim ve içerik kütüphanesi sunar. Sosyal
        medya paylaşımları sizin tarafınızdan manuel yapılır; uygulama hesaplarınıza otomatik gönderi yayınlamaz.
      </p>
      <h2>Yapay zekâ çıktıları</h2>
      <ul>
        <li>Üretilen metin ve görseller hatalı, eksik veya size özgü olmayabilir. Paylaşmadan önce mutlaka kontrol edin.</li>
        <li>Fiyat, tarih, indirim oranı gibi bilgilerin doğruluğundan siz sorumlusunuz.</li>
        <li>Üçüncü kişilerin telif, marka veya kişilik haklarını ihlal eden içerik üretmeyin ya da yüklemeyin.</li>
      </ul>
      <h2>Stok içerikler</h2>
      <p>Pixabay içerikleri Pixabay lisansına tabidir; kullanım koşullarını kendiniz kontrol etmelisiniz.</p>
      <h2>Kabul edilemez kullanım</h2>
      <p>
        Yasa dışı, aldatıcı, nefret içeren veya zararlı içerik üretmek; hizmeti kötüye kullanmak, kotaları aşmaya
        çalışmak veya başkalarının hesaplarına erişmeye çalışmak yasaktır. İhlal halinde hesap kısıtlanabilir.
      </p>
      <h2>Kullanım sınırları</h2>
      <p>Hizmetin sürekliliğini korumak için saatlik üretim ve depolama sınırları uygulanır; sınırlar değişebilir.</p>
      <h2>Sorumluluk</h2>
      <p>
        Hizmet &ldquo;olduğu gibi&rdquo; sunulur; kesintisiz veya hatasız çalışacağı garanti edilmez. Yasaların izin
        verdiği ölçüde, hizmetin kullanımından doğan dolaylı zararlardan sorumlu değiliz.
      </p>
      <h2>Hesap ve silme</h2>
      <p>Hesabınızı &ldquo;Hesabım&rdquo; sayfasından istediğiniz zaman silebilirsiniz.</p>
      <p className="rounded-xl border border-line bg-surface-2/70 p-3 text-xs text-muted">
        Not: Bu metin bir şablondur. Yayına almadan önce şirket unvanı, iletişim bilgisi ve yetkili mahkeme gibi
        bilgileri ekleyip bir hukuk danışmanına kontrol ettirin.
      </p>
    </LegalPage>
  );
}
