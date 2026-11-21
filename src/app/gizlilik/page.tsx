import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Gizlilik Politikası" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Gizlilik Politikası ve KVKK Aydınlatma Metni" updated="21 Kasım 2026">
      <p>
        Aı Asisst, işletmelerin sosyal medya içeriklerini hazırlamasına, planlamasına ve saklamasına yardımcı olur.
        Bu metin hangi verileri, neden ve kimlerle işlediğimizi açıklar.
      </p>
      <h2>İşlenen veriler</h2>
      <ul>
        <li>Hesap bilgileri: e-posta adresi ve şifre (şifre yalnızca doğrulama altyapısında özetlenmiş biçimde tutulur).</li>
        <li>Marka bilgileri: işletme adı, sektör, ürünler, hedef kitle, marka dili, renkler, logo ve eklediğiniz sosyal hesap adları.</li>
        <li>Ürettiğiniz veya yüklediğiniz içerikler: metinler, görseller, videolar, 3B modeller ve takvim kayıtları.</li>
      </ul>
      <h2>Kullanım amacı</h2>
      <p>
        Verileriniz yalnızca hizmeti sunmak için kullanılır: içerik üretmek, görsel hazırlamak, takvim ve kütüphanenizi
        göstermek. Verileriniz satılmaz ve reklam amacıyla kullanılmaz.
      </p>
      <h2>Hizmet sağlayıcılar</h2>
      <ul>
        <li>Veri tabanı, oturum ve dosya depolama: Supabase.</li>
        <li>Uygulama barındırma: Vercel.</li>
        <li>
          Yapay zekâ ile metin/görsel üretimi: marka profiliniz ve isteğiniz, üretim için yapay zekâ sağlayıcılarına
          (öncelikle Google Gemini; yapılandırılmışsa yedek olarak DeepSeek veya OpenAI) gönderilir. Kişisel veri
          içermeyen brief yazmanızı öneririz.
        </li>
        <li>Stok fotoğraf ve video araması: Pixabay (yalnızca arama ifadeniz gönderilir).</li>
      </ul>
      <p>Bu sağlayıcılar yurt dışında bulunabilir; bu nedenle verileriniz yurt dışına aktarılabilir.</p>
      <h2>Saklama ve silme</h2>
      <p>
        Verileriniz hesabınız açık olduğu sürece saklanır. &ldquo;Hesabım&rdquo; sayfasından verilerinizi
        indirebilir ve hesabınızı kalıcı olarak silebilirsiniz; silme işlemi marka, içerik, görsel ve takvim kayıtlarınızı
        da kaldırır.
      </p>
      <h2>Haklarınız (KVKK madde 11)</h2>
      <p>
        Verilerinize erişme, düzeltme, silme, işlenmesine itiraz etme ve taşıma haklarınız vardır. Bunların çoğunu
        &ldquo;Hesabım&rdquo; sayfasından kendiniz yapabilirsiniz; diğer talepleriniz için bizimle iletişime geçin.
      </p>
      <h2>Çerezler ve yerel depolama</h2>
      <p>
        Oturumunuzu açık tutmak ve tema/marka seçiminizi hatırlamak için tarayıcınızın yerel depolaması kullanılır.
        Reklam veya takip çerezi kullanılmaz.
      </p>
      <p className="rounded-xl border border-line bg-surface-2/70 p-3 text-xs text-muted">
        Not: Bu metin bir şablondur. Yayına almadan önce veri sorumlusu unvanı ve iletişim adresinizi ekleyip bir hukuk
        danışmanına kontrol ettirin.
      </p>
    </LegalPage>
  );
}
