# Aı Asisst — Sosyal Medya İçerik Asistanı

KOBİ'lerin ve markaların sosyal medya içeriklerini tek bir çalışma alanında planlamasına, üretmesine ve yönetmesine yardımcı olan web uygulaması. Marka profili, yapay zekâ ile metin ve görsel hazırlama, içerik kütüphanesi ve manuel paylaşım takvimi MVP kapsamındadır.

> **Ürün kapsamı:** Bu sürüm içerik üretimi ve planlamayı destekler; Instagram, TikTok veya diğer platformlara otomatik gönderi yayımlamaz. Profilde sosyal hesaplar hedef seçmek ve manuel paylaşımı kaydetmek için tutulur; OAuth/platform API bağlantısı yoktur.

## Mevcut özellikler

| Alan | Uygulama | Durum ve sınırlar |
|---|---|---|
| İşletme / marka profili | `/` | Bir hesapta birden fazla marka, kullanıcıya özel aktif marka seçimi, marka adı, sektör, ürünler, hedef kitle, marka dili, **ana + yardımcı renk**, logo ve sosyal hesaplar. Sosyal hesap kayıtları platform bağlantısı değildir. |
| İçerik üretimi | `/uret` | Marka profiline göre gönderi, açıklama, hashtag, reklam ve hikâye metni; alternatif tonlar; kütüphaneye taslak olarak kaydetme. Gemini → DeepSeek → OpenAI yedek sırası. |
| Görsel oluşturma | `/gorsel` | Üç adımlı içerik/tasarım/arka plan akışı; marka renkleri/logo ve oran slider'ı, şablon galerisi, metin düzenleme ve canlı önizleme; Pixabay fotoğraf/video araması; seçilen fotoğraf, video posteri veya GLB model karesi arka plan olurken medya özel depoya ve kütüphaneye kaydedilir; PNG indirme veya özel depoda çıktı kaydı. |
| İçerik takvimi | `/takvim` | Ay/hafta görünümü, kayıtlı sosyal hesap seçimi, hatırlatma zamanı, saat değiştirme ve manuel “paylaşıldı” günlüğü (`posted_at`, isteğe bağlı `post_url`). Hatırlatma yalnızca uygulama içindedir; e-posta/push bildirimi yoktur. |
| İçerik kütüphanesi | `/kutuphane` | Arama, durum filtresi, düzenleme, onay/taslak, metin indirme; özel saklanan görsel, MP4/WebM video ve 3D modelleri görüntüleme/oynatma, silme ve içeriği yeniden kullanma. |
| Hesap ve veri erişimi | Supabase Auth + RLS | E-posta/şifre oturumu, aktif `business_id` filtreleri ve işletme sahibine göre satır düzeyinde erişim politikaları; üretim API'leri marka sahipliğini ayrıca doğrular. |

## Teknoloji

- Next.js 16, React 19 ve TypeScript
- Supabase: kimlik doğrulama ve PostgreSQL
- Gemini, DeepSeek ve OpenAI: sunucu tarafı metin üretimi yedek zinciri
- Gemini: isteğe bağlı görsel arka plan üretimi
- GitHub: kaynak kodu ve sürüm kontrolü

## Yerel kurulum

1. Node.js `22.23.4` (veya `package.json` içindeki `engines` aralığı) ve npm kurulu olmalıdır; `.nvmrc` bu sürümü gösterir.
2. Depoyu klonlayın ve bağımlılıkları yükleyin:

   ```bash
   npm ci
   ```

3. `.env.example` dosyasını `.env.local` olarak kopyalayın; Supabase URL/publishable key ve kullanacağınız model sağlayıcı anahtarlarını ekleyin. Pixabay araması için `PIXABAY_API_KEY` gerekir. `NEXT_PUBLIC_` değişkenleri tarayıcıya açık olacağından bunlara gizli anahtar koymayın.
4. Supabase projesinde sırasıyla `schema.sql`, `schema_v2_image_usage.sql`, `schema_v3_visual_storage.sql`, `schema_v4_media_library.sql`, `schema_v5_workspace_and_manual_publishing.sql` ve `schema_v6_atomic_profile_and_media_integrity.sql` dosyalarını SQL Editor üzerinden çalıştırın.
5. Geliştirme sunucusunu başlatın:

   ```bash
   npm run dev
   ```

6. Kontroller:

   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

Gerekli Supabase veya AI sağlayıcı anahtarları yoksa ilgili özellikler çalışmaz. `.env.local` dosyasını Git'e eklemeyin.

## Yayın ortamı

Vercel için `.env.example` içindeki değişkenleri proje ayarlarına ekleyin. En azından Supabase URL ve publishable key ile bir metin sağlayıcı anahtarı gerekir. Görsel üretimi için Gemini anahtarı; Pixabay araması için yalnızca sunucuda tutulan `PIXABAY_API_KEY` gerekir. `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GEMINI_IMAGE_MODEL`, `DEEPSEEK_MODEL` ve `OPENAI_MODEL` isteğe bağlı model seçimleridir.

Supabase başlangıç SQL'leri:

1. `schema.sql`
2. `schema_v2_image_usage.sql` (eski görsel üretim kullanım kaydı; politika tekrar çalıştırılabilir)
3. `schema_v3_visual_storage.sql` (özel görsel deposu ve `businesses` RLS görünürlüğünü aşmadan sahiplik denetleyen Storage politikaları)
4. `schema_v4_media_library.sql` (medya türü alanı, genişletilmiş MIME/50 MB limitli özel bucket)
5. `schema_v5_workspace_and_manual_publishing.sql` (manuel yayın günlüğü/hedef hesap, atomik sosyal hesap eşitleme ve üretim kotası, telafi edilebilir Storage temizliği)
6. `schema_v6_atomic_profile_and_media_integrity.sql` (profil+sosyal hesapların tek transaction'da kaydı ve içerik business_id değişmezliği)

Şema değişikliklerini canlı veritabanına uygulamadan önce yedek alın ve staging ortamında deneyin. İki farklı kullanıcıyla RLS izolasyonunu doğrulamadan canlıya çıkmayın.

## Güvenlik ve işletim notları

- Tarayıcıda yalnızca Supabase publishable/anon anahtarı kullanılır; `service_role` anahtarı veya AI sağlayıcı anahtarları istemciye konmamalıdır.
- Veritabanı tablolarında RLS etkinleştirilmiştir. Gerçek güvenlik, Supabase SQL şemasının hedef projede doğru uygulanmasına bağlıdır.
- Metin ve görsel üretim uçları oturum belirtecini ve seçilen markanın sahipliğini doğrular; `schema_v5_workspace_and_manual_publishing.sql` kotayı DB kilidiyle atomik olarak ayırır (marka başına saatte metin 30, görsel 10). Başarısız üretim rezervasyonu bırakır.
- Canlıya çıkmadan önce staging veritabanında iki kullanıcıyla RLS izolasyonunu, eşzamanlı kota çağrılarını, sağlayıcı limitlerini ve maliyet alarmlarını ayrıca doğrulayın.
- Pixabay aramasında API anahtarı yalnızca sunucu tarafındaki `PIXABAY_API_KEY` olarak saklanır. Arama sonuçları 24 saat cache edilir; fotoğraflar (12 MB) ve seçilen videolar (50 MB, MP4/WebM) sunucuda özel depoya kopyalanır, harici URL'ye kalıcı hotlink yapılmaz. Video için Pixabay poster karesi kompozisyon arka planına uygulanır; 3D model için resmi API olmadığından kullanıcı Pixabay kataloğuna yönlendirilir ve doğrulanmış tek dosyalı GLB (50 MB, GLB v2, harici doku/URL reddi) kütüphaneye alınır; WebGL destekleniyorsa model karesi arka plan olur. Kaynak/yaratıcı bilgisi kayda eklenir; üçüncü taraf marka/kişilik/telif haklarını ayrıca kontrol edin. Detaylar [`docs/pixabay-integration-notes.md`](docs/pixabay-integration-notes.md) dosyasındadır.
- Kütüphaneye medya kaydetmek için `schema_v3_visual_storage.sql` ve ardından `schema_v4_media_library.sql` uygulanmalıdır. Bu iki dosyanın güncel sürümü MP4/WebM MIME türlerini de izin listesine ekler; eski kurulumda yalnızca v4'ü tekrar çalıştırarak bucket allowlist'ini yenileyin (v3'ü de yeniden çalıştırmak güvenlidir). Bucket özeldir; yalnızca medya yolundaki işletmenin sahibi dosyayı okuyabilir, yükleyebilir ve silebilir. `DEPO_IZIN_400` veya video MIME hatası görülürse güncel v3 ardından v4'ü Supabase SQL Editor'de tekrar çalıştırın. Profil ve sosyal hesapların atomik kaydı ile içerik `business_id` güvenliği için v5'ten sonra v6 migration'ı da gereklidir. Bu depodan canlı Supabase'e otomatik migration uygulanmaz.
- Şifre sıfırlama, e-posta daveti, ekip/rol yönetimi, denetim kaydı ve hesap silme akışları bu MVP'de tamamlanmış ürün özellikleri olarak sunulmaz.

## Marka paleti kuralı

Markada tek bir **ana renk** ve tek bir **yardımcı renk** bulunur; profil ekranında ikisi de seçilmeden kayıt tamamlanamaz. Kural tek kaynakta, `src/lib/brand-palette.ts` içinde yaşar ve her üretim aynı paletten beslenir.

Metin üretiminde marka promptu iki rengi rolleriyle (baskın ve vurgu) verir, oranı söyler ve üçüncü bir marka rengi uydurulmasını engeller. Görsel stüdyosunda ana renk payı %50–90 arasında birer puanla ayarlanır; yardımcı renk kalan payı alır. 11 şablon alan paylaşımını farklı kompozisyonlarla uygular ve fotoğraf varsa çoğu şablon şekilleri onun üzerine katmanlar. Kare, hikâye/dikey video, portre, yatay video/kapak, geniş yatay ve uzun dikey pin biçimleri seçilebilir. Yapay zekâ arka planı üretilirken isteme iki hex kodu ile aynı oran yazılır. Hikâye formatındaki güvenli alan çizgileri önizlemede rehberdir ve PNG'ye basılmaz. Formatlar dışa aktarım ölçüleridir; sosyal ağların güncel kırpma ve metin güvenli alanları yayın öncesinde ilgili uygulamada kontrol edilmelidir.

Veritabanı şeması değişmez: `businesses.brand_colors` iki hex kodu saklar. Eski veya eksik kayıtlar migrasyon istemez — ilk iki renk okunur, tek renk varsa yardımcı renk ana renkten yaklaşık 3.4:1 kontrastla türetilir, hiç renk yoksa örnek çift kullanılır. Profil ekranı oranı ve yazı rengi tercihini canlı önizlemeyle gösterir, renkler birbirine çok yakınsa uyarı verir.

## Ürün sınırları ve önerilen sonraki işler

Bu sürümde bilinçli olarak kapsam dışında kalan veya canlıya çıkmadan önce doğrulanması gereken konular:

1. **Sosyal platform bağlantıları ve otomatik yayın:** Hedef platformları seçin; OAuth, gerekli izinler, token saklama/yenileme, API incelemesi ve platform kurallarını her biri için tasarlayın. Paylaşım öncesi kullanıcı onayı, başarısız gönderi ve yeniden deneme akışları ekleyin. Altı platformun resmî koşulları, ortak kuyruk mimarisi ve faz planı [`docs/platform-entegrasyon-plani.md`](docs/platform-entegrasyon-plani.md) dosyasındadır.
2. **Veritabanı entegrasyon testleri:** Vitest saf yardımcıları kapsar; RLS sahiplik izolasyonu, gerçek eşzamanlı kota RPC'leri ve Storage hata senaryoları staging Supabase projesinde ayrıca doğrulanmalıdır.
3. **Bildirimler ve işbirliği:** Uygulama dışı hatırlatma (e-posta/push), ekip üyeleri, roller ve onay akışları ürün ihtiyacına göre eklenebilir.
4. **Medya operasyonu:** Saklama süresi, gizlilik metni, yedekleme ve maliyet/log izlemesini canlı ürün için belirleyin.
5. **Ürün sunum deneyimi:** Bu depo şu an oturum sonrası kullanılan ürün arayüzüdür; herkese açık tanıtım/plan/fiyat sayfaları ve ödeme altyapısı kapsamda değildir.

## Depo yapısı

- `src/app/`: sayfalar ve `/api/generate`, `/api/image`, `/api/media/library`, `/api/media/pixabay/*`, `/api/media/models` sunucu uçları
- `src/components/`: uygulama kabuğu (`AppShell`), tasarım sistemi (`Ui`, `Icons`), profil, üretici, görsel/medya seçici, 3D görüntüleyici, takvim, kütüphane ve paylaşım arayüzleri
- `src/lib/`: Supabase erişimi, marka promptu, sağlayıcılar ve saf yardımcılar
- `schema.sql`: temel tablolar, ilişkiler, tetikleyiciler ve RLS politikaları
- `schema_v2_image_usage.sql`: görsel üretim kullanım kaydı
- `schema_v3_visual_storage.sql`: özel medya deposu ve RLS politikaları
- `schema_v4_media_library.sql`: medya türleri ve fotoğraf/video/model depolaması
- `schema_v5_workspace_and_manual_publishing.sql`: aktif marka akışına uygun RPC'ler, manuel yayın günlüğü, atomik kota ve telafi edilebilir medya temizliği
- `schema_v6_atomic_profile_and_media_integrity.sql`: atomik profil+hesap kaydı ve içerik marka kimliği bütünlüğü
- `src/lib/*.test.ts`, `vitest.config.mts`: marka paleti, PNG doğrulama, GLB ve güvenli paylaşım URL birim testleri
- `.env.example`: beklenen ortam değişkenleri için örnek
- `docs/platform-entegrasyon-plani.md`: platform API koşulları ve otomatik yayına geçiş planı
- `docs/pixabay-integration-notes.md`: Pixabay API, 3D katalog ve lisans koşulları
