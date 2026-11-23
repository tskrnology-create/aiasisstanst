# Aı Asisst — Sosyal Medya İçerik Asistanı

KOBİ'lerin ve markaların sosyal medya içeriklerini tek bir çalışma alanında planlamasına, üretmesine ve yönetmesine yardımcı olan web uygulaması. Marka profili, yapay zekâ ile metin ve görsel hazırlama, içerik kütüphanesi ve manuel paylaşım takvimi MVP kapsamındadır.

> **Ürün kapsamı:** Bu sürüm içerik üretimi ve planlamayı destekler; Instagram, TikTok veya diğer platformlara otomatik gönderi yayımlamaz. Profilde sosyal hesaplar hedef seçmek ve manuel paylaşımı kaydetmek için tutulur; OAuth/platform API bağlantısı yoktur.

## Mevcut özellikler

| Alan | Uygulama | Durum ve sınırlar |
|---|---|---|
| İşletme paneli | `/` | Aktif markanın taslak/onaylı içerik sayılarını, yaklaşan ve gecikmiş manuel paylaşım planlarını ve son içerikleri gerçek kayıtlardan gösterir; sosyal performans verisi uydurmaz. |
| İşletme / marka profili | `/marka` (`/profil` eski bağlantısı yönlenir) | Bir hesapta birden fazla marka, kullanıcıya özel aktif marka seçimi, marka bilgileri ve sosyal hesaplar; ana/yardımcı renk dengesini iki ucu renklerle işaretlenmiş slider belirler ve profilde saklanır. Sosyal hesap kayıtları platform bağlantısı değildir. |
| İçerik üretimi (Stüdyo · Yaz) | `/studyo` | Marka profiline göre gönderi, açıklama, hashtag, reklam ve hikâye metni; alternatif tonlar; kütüphaneye taslak olarak kaydetme. Gemini → DeepSeek → OpenAI yedek sırası. |
| Görsel oluşturma (Stüdyo · Görsel) | `/studyo?adim=gorsel&content=<id>` | Üç adımlı içerik/tasarım/arka plan akışı; marka renkleri/logo ve oran slider'ı, şablon galerisi, metin düzenleme ve canlı önizleme; Pixabay fotoğraf/video araması; seçilen fotoğraf, video posteri veya GLB model karesi arka plan olurken medya özel depoya ve kütüphaneye kaydedilir; PNG indirme veya özel depoda çıktı kaydı. |
| İçerik takvimi (İçerikler · Takvim; Stüdyo · Planla) | `/icerikler?gorunum=takvim` | Ay/hafta görünümü, kayıtlı sosyal hesap seçimi, hatırlatma zamanı, saat değiştirme ve manuel “paylaşıldı” günlüğü (`posted_at`, isteğe bağlı `post_url`). Hatırlatma yalnızca uygulama içindedir; e-posta/push bildirimi yoktur. |
| İçerik kütüphanesi (İçerikler · Liste) | `/icerikler` | Arama, durum filtresi, düzenleme, onay/taslak, metin indirme; özel saklanan görsel, MP4/WebM video ve 3D modelleri görüntüleme/oynatma, silme ve içeriği yeniden kullanma. |
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
4. Supabase projesinde `Yayın ortamı` bölümündeki `schema.sql` ve v2–v9 dosyalarını belirtilen sırayla SQL Editor üzerinden çalıştırın. v9 renk dengesinin kalıcılığı ve içerik görseli değiştirme akışını gerektirir.
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
7. `schema_v7_hardening_and_account.sql` (anon yetkilerinin kaldırılması, kullanıcı başına 10 marka sınırı, hesap silme RPC'si `delete_my_account`, alan uzunluk sınırları). Hesabım sayfasındaki "Hesabı sil" bu dosya uygulanmadan çalışmaz.
8. `schema_v8_post_packages.sql` (içeriğe `format` ve yapılandırılmış `package` sütunları: kanca, gövde, çağrı, slayt/sahne, görsel fikri). Uygulanmazsa üretim yine çalışır, yalnızca paket yapısı saklanmaz.
9. `schema_v9_brand_ratio_and_visual_cleanup.sql` (profildeki ana renk payı, atomik profil RPC güncellemesi ve eski özel görseller için RLS korumalı tekrar denenebilir temizlik kuyruğu). Mevcut içerik seçilerek görsel kaydetmek bu migration'ı gerektirir.

Bu görevde v9 migration dosyası hazırlanmış fakat hiçbir canlı Supabase veritabanına uygulanmamıştır. Şema değişikliklerini uygulamadan önce yedek alın ve staging ortamında deneyin. İki farklı kullanıcıyla RLS izolasyonunu doğrulamadan canlıya çıkmayın.

## Güvenlik ve işletim notları

- Tarayıcıda yalnızca Supabase publishable/anon anahtarı kullanılır; `service_role` anahtarı veya AI sağlayıcı anahtarları istemciye konmamalıdır.
- Veritabanı tablolarında RLS etkinleştirilmiştir. Gerçek güvenlik, Supabase SQL şemasının hedef projede doğru uygulanmasına bağlıdır.
- Metin ve görsel üretim uçları oturum belirtecini ve seçilen markanın sahipliğini doğrular; `schema_v5_workspace_and_manual_publishing.sql` kotayı DB kilidiyle atomik olarak ayırır (marka başına saatte metin 30, görsel 10). Başarısız üretim rezervasyonu bırakır.
- Canlıya çıkmadan önce staging veritabanında iki kullanıcıyla RLS izolasyonunu, eşzamanlı kota çağrılarını, sağlayıcı limitlerini ve maliyet alarmlarını ayrıca doğrulayın.
- Pixabay aramasında API anahtarı yalnızca sunucu tarafındaki `PIXABAY_API_KEY` olarak saklanır. Arama sonuçları 24 saat cache edilir; fotoğraflar (12 MB) ve seçilen videolar (50 MB, MP4/WebM) sunucuda özel depoya kopyalanır, harici URL'ye kalıcı hotlink yapılmaz. Video için Pixabay poster karesi kompozisyon arka planına uygulanır; 3D model için resmi API olmadığından kullanıcı Pixabay kataloğuna yönlendirilir ve doğrulanmış tek dosyalı GLB (50 MB, GLB v2, harici doku/URL reddi) kütüphaneye alınır; WebGL destekleniyorsa model karesi arka plan olur. Kaynak/yaratıcı bilgisi kayda eklenir; üçüncü taraf marka/kişilik/telif haklarını ayrıca kontrol edin. Detaylar [`docs/pixabay-integration-notes.md`](docs/pixabay-integration-notes.md) dosyasındadır.
- Kütüphaneye medya kaydetmek için `schema_v3_visual_storage.sql` ve ardından `schema_v4_media_library.sql` uygulanmalıdır. Eski kurulumda bucket allowlist'ini v4'ü tekrar çalıştırarak yenileyin. Bucket özeldir; yalnızca medya yolundaki işletmenin sahibi dosyayı okuyabilir, yükleyebilir ve silebilir. İçeriğe görsel ekleme/değiştirme ve önceki özel dosyayı tekrar denenebilir kuyrukla temizleme v9'u gerektirir. Bu depodan canlı Supabase'e otomatik migration uygulanmaz.
- Şifre sıfırlama, e-posta daveti, ekip/rol yönetimi, denetim kaydı ve hesap silme akışları bu MVP'de tamamlanmış ürün özellikleri olarak sunulmaz.

## Marka paleti kuralı

Markada tek bir **ana renk** ve tek bir **yardımcı renk** bulunur; profil ekranında ikisi de seçilmeden kayıt tamamlanamaz. Kural tek kaynakta, `src/lib/brand-palette.ts` içinde yaşar ve her üretim aynı paletten beslenir.

Metin üretiminde marka promptu iki rengi rolleriyle (baskın ve vurgu) verir, saklanan oranı söyler ve üçüncü bir marka rengi uydurulmasını engeller. Profil slider'ının sol ucu ana renk, sağ ucu yardımcı renktir; başlangıç dengesi %70 ana renktir. Tekil görsel tasarımında bu varsayılan ayrıca değiştirilebilir. 11 şablon alan paylaşımını farklı kompozisyonlarla uygular; fotoğraf varsa çoğu şablon şekilleri onun üzerine katmanlar. Kare, hikâye/dikey video, portre, yatay video/kapak, geniş yatay ve uzun dikey pin biçimleri seçilebilir. Yapay zekâ arka planı üretilirken geçerli oran prompta yazılır. Hikâye formatındaki güvenli alan çizgileri önizlemede rehberdir ve PNG'ye basılmaz. Formatlar dışa aktarım ölçüleridir; sosyal ağların güncel kırpma ve metin güvenli alanları yayın öncesinde ilgili uygulamada kontrol edilmelidir.

`businesses.brand_colors` ana/yardımcı iki hex kodu saklar; `businesses.primary_share` ana rengin 0–100 payını saklar. v9 öncesi kayıtlar %70 varsayılanını kullanır. Eksik renklerde ilk iki geçerli renk okunur, tek renk varsa yardımcı renk türetilir, hiç renk yoksa örnek çift kullanılır. Profil ekranı renk dengesini ve kontrast uyarısını önizler.

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
- `schema_v7_hardening_and_account.sql`: güvenlik sertleştirmesi ve hesap silme
- `schema_v8_post_packages.sql`: içerik biçimi ve yapılandırılmış paket
- `schema_v9_brand_ratio_and_visual_cleanup.sql`: kalıcı renk oranı, atomik görsel değişimi ve eski medya cleanup kuyruğu (canlıya uygulanmadı)
- `src/lib/*.test.ts`, `vitest.config.mts`: marka paleti, PNG doğrulama, GLB ve güvenli paylaşım URL birim testleri
- `.env.example`: beklenen ortam değişkenleri için örnek
- `docs/platform-entegrasyon-plani.md`: platform API koşulları ve otomatik yayına geçiş planı
- `docs/pixabay-integration-notes.md`: Pixabay API, 3D katalog ve lisans koşulları
- `docs/social-workflow-research.md`: manuel yayın, platform kısıtları ve beş aracın resmî kaynaklarından ürün çıkarımları
