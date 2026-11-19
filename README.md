# Aı Asisst — Sosyal Medya İçerik Asistanı

KOBİ'lerin ve markaların sosyal medya içeriklerini tek bir çalışma alanında planlamasına, üretmesine ve yönetmesine yardımcı olan web uygulaması. Marka profili, yapay zekâ ile metin ve görsel hazırlama, içerik kütüphanesi ve manuel paylaşım takvimi MVP kapsamındadır.

> **Ürün kapsamı:** Bu sürüm içerik üretimi ve planlamayı destekler; Instagram, TikTok veya diğer platformlara otomatik gönderi yayımlamaz. Profilde sosyal hesap kullanıcı adları saklanabilir, fakat OAuth/Platform API bağlantısı henüz yoktur.

## Mevcut özellikler

| Alan | Uygulama | Durum ve sınırlar |
|---|---|---|
| İşletme / marka profili | `/` | İşletme adı, sektör, ürünler, hedef kitle, marka dili, **ana + yardımcı renk** (ikisi de zorunlu), logo, dil ve sosyal kullanıcı adları. Sosyal hesap kayıtları platform bağlantısı değildir. |
| İçerik üretimi | `/uret` | Marka profiline göre gönderi, açıklama, hashtag, reklam ve hikâye metni; alternatif tonlar; kütüphaneye taslak olarak kaydetme. Gemini → DeepSeek → OpenAI yedek sırası. |
| Görsel oluşturma | `/gorsel` | Metin/şablon tabanlı tasarım, marka renkleri/logo, **%50–90 arasında hassas renk oranı slider'ı**, hızlı şablon araç çubuğu + ek stiller, altı çıktı biçimi (1:1, 9:16, 4:5, 16:9, 1.91:1, 2:3), fotoğraf üstüne marka şekilleri, hikâye güvenli alanı kılavuzu, arka plan yükleme veya Gemini ile üretme, PNG indirme ya da özel depoda kütüphaneye kaydetme. |
| İçerik takvimi | `/takvim` | Ay/hafta görünümü, içerik ve platform seçimi, hatırlatma zamanı, saat değiştirme ve manuel “paylaşıldı” takibi. Hatırlatma yalnızca uygulama içindedir; e-posta/push bildirimi yoktur. |
| İçerik kütüphanesi | `/kutuphane` | Arama, durum filtresi, düzenleme, onay/taslak, metin indirme, kaydedilmiş görselleri özel imzalı bağlantıyla görüntüleme, silme ve içeriği yeniden kullanma. |
| Hesap ve veri erişimi | Supabase Auth + RLS | E-posta/şifre oturumu ve işletme sahibine göre satır düzeyinde erişim politikaları. |

## Teknoloji

- Next.js 16, React 19 ve TypeScript
- Supabase: kimlik doğrulama ve PostgreSQL
- Gemini, DeepSeek ve OpenAI: sunucu tarafı metin üretimi yedek zinciri
- Gemini: isteğe bağlı görsel arka plan üretimi
- GitHub: kaynak kodu ve sürüm kontrolü

## Yerel kurulum

1. Node.js ve npm kurulu olmalıdır.
2. Depoyu klonlayın ve bağımlılıkları yükleyin:

   ```bash
   npm ci
   ```

3. `.env.example` dosyasını `.env.local` olarak kopyalayın; Supabase URL/publishable key ve kullanacağınız model sağlayıcı anahtarlarını ekleyin. `NEXT_PUBLIC_` değişkenleri tarayıcıya açık olacağından bunlara gizli anahtar koymayın.
4. Supabase projesinde sırasıyla `schema.sql`, `schema_v2_image_usage.sql` ve `schema_v3_visual_storage.sql` dosyalarını SQL Editor üzerinden çalıştırın.
5. Geliştirme sunucusunu başlatın:

   ```bash
   npm run dev
   ```

6. Kontroller:

   ```bash
   npm run lint
   npm run build
   ```

Gerekli Supabase veya AI sağlayıcı anahtarları yoksa ilgili özellikler çalışmaz. `.env.local` dosyasını Git'e eklemeyin.

## Yayın ortamı

Vercel için `.env.example` içindeki değişkenleri proje ayarlarına ekleyin. En azından Supabase URL ve publishable key ile bir metin sağlayıcı anahtarı gerekir. Görsel üretimi için Gemini anahtarı (ücretli plan gerekebilir) veya ücretsiz stok fotoğraf için `PEXELS_API_KEY` (pexels.com/api, yalnızca sunucuda) gerekir. Pexels şartı: fotoğraf gösterilen yerde Pexels bağlantısı ve fotoğrafçı atfı (arayüzde var); sınır saatte 200 istek. `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GEMINI_IMAGE_MODEL`, `DEEPSEEK_MODEL` ve `OPENAI_MODEL` isteğe bağlı model seçimleridir.

Supabase başlangıç SQL'leri:

1. `schema.sql`
2. `schema_v2_image_usage.sql` (görsel üretim kullanım kaydı ve kotası)
3. `schema_v3_visual_storage.sql` (özel görsel deposu ve işletme sahibine göre Storage politikaları)

Şema değişikliklerini canlı veritabanına uygulamadan önce yedek alın ve staging ortamında deneyin. İki farklı kullanıcıyla RLS izolasyonunu doğrulamadan canlıya çıkmayın.

## Güvenlik ve işletim notları

- Tarayıcıda yalnızca Supabase publishable/anon anahtarı kullanılır; `service_role` anahtarı veya AI sağlayıcı anahtarları istemciye konmamalıdır.
- Veritabanı tablolarında RLS etkinleştirilmiştir. Gerçek güvenlik, Supabase SQL şemasının hedef projede doğru uygulanmasına bağlıdır.
- Metin ve görsel üretim uçları oturum belirtecini doğrular, giriş uzunluğunu sınırlar ve saatlik kullanım kontrolü uygular.
- Kota sınırları maliyet kontrolü için temel korumadır; canlı kullanımdan önce eşzamanlı istekler, sağlayıcı limitleri, kötüye kullanım ve maliyet alarmları ayrıca test edilmelidir.
- Görsel üretimi için `schema_v2_image_usage.sql` uygulanmamışsa görsel endpoint'i kullanım sayacını okuyamaz ve istek başarısız olur.
- PNG tasarımlarını kütüphaneye kaydetmek için `schema_v3_visual_storage.sql` uygulanmalıdır. Bucket özeldir; yalnızca görselin yolundaki işletmenin sahibi dosyayı okuyabilir, yükleyebilir ve silebilir.
- Şifre sıfırlama, e-posta daveti, ekip/rol yönetimi, denetim kaydı ve hesap silme akışları bu MVP'de tamamlanmış ürün özellikleri olarak sunulmaz.

## Marka paleti kuralı

Markada tek bir **ana renk** ve tek bir **yardımcı renk** bulunur; profil ekranında ikisi de seçilmeden kayıt tamamlanamaz. Kural tek kaynakta, `src/lib/brand-palette.ts` içinde yaşar ve her üretim aynı paletten beslenir.

Metin üretiminde marka promptu iki rengi rolleriyle (baskın ve vurgu) verir, oranı söyler ve üçüncü bir marka rengi uydurulmasını engeller. Görsel stüdyosunda ana renk payı %50–90 arasında birer puanla ayarlanır; yardımcı renk kalan payı alır. 11 şablon alan paylaşımını farklı kompozisyonlarla uygular ve fotoğraf varsa çoğu şablon şekilleri onun üzerine katmanlar. Kare, hikâye/dikey video, portre, yatay video/kapak, geniş yatay ve uzun dikey pin biçimleri seçilebilir. Yapay zekâ arka planı üretilirken isteme iki hex kodu ile aynı oran yazılır. Hikâye formatındaki güvenli alan çizgileri önizlemede rehberdir ve PNG'ye basılmaz. Formatlar dışa aktarım ölçüleridir; sosyal ağların güncel kırpma ve metin güvenli alanları yayın öncesinde ilgili uygulamada kontrol edilmelidir.

Veritabanı şeması değişmez: `businesses.brand_colors` iki hex kodu saklar. Eski veya eksik kayıtlar migrasyon istemez — ilk iki renk okunur, tek renk varsa yardımcı renk ana renkten yaklaşık 3.4:1 kontrastla türetilir, hiç renk yoksa örnek çift kullanılır. Profil ekranı oranı ve yazı rengi tercihini canlı önizlemeyle gösterir, renkler birbirine çok yakınsa uyarı verir.

## Ürün sınırları ve önerilen sonraki işler

Aşağıdaki konular tamamlanmış özellik değildir; canlı ürün kapsamına göre planlanmalıdır:

1. **Sosyal platform bağlantıları ve otomatik yayın:** Hedef platformları seçin; OAuth, gerekli izinler, token saklama/yenileme, API incelemesi ve platform kurallarını her biri için tasarlayın. Paylaşım öncesi kullanıcı onayı, başarısız gönderi ve yeniden deneme akışları ekleyin. Altı platformun resmî koşulları, ortak kuyruk mimarisi ve faz planı [`docs/platform-entegrasyon-plani.md`](docs/platform-entegrasyon-plani.md) dosyasındadır.
2. **Birden fazla marka/işletme:** Şema kullanıcı başına birden fazla işletmeye izin verebilir; mevcut ekranlar çoğunlukla en eski işletmeyi seçer. Marka seçici ve her sayfada seçili işletme bağlamı eklenmeden ajans/çok markalı deneyim tamamlanmış sayılmaz.
3. **Güvenilir kullanım kotaları:** Sunucu tarafında atomik kota/limit uygulaması ve üretim ortamında izleme ekleyin; istemci veya eşzamanlı isteklerle aşılabilecek sayaçlara tek başına güvenmeyin.
4. **Test kapsamı:** Prompt/yanıt doğrulama, RLS sahiplik izolasyonu, oturum süresi dolması, rate limit ve Supabase hata senaryoları için otomatik testler ekleyin.
5. **Bildirimler ve işbirliği:** Uygulama dışı hatırlatma (e-posta/push), ekip üyeleri, roller ve onay akışları ürün ihtiyacına göre eklenebilir.
6. **Medya operasyonu:** `schema_v3_visual_storage.sql` özel PNG bucket'ı ve işletme sahibine göre Storage erişimini kurar; kütüphaneden silinen kaydın görseli de temizlenir. Saklama süresi, gizlilik metni, yedekleme ve maliyet/log izlemeyi canlı ürün için belirleyin.
7. **Ürün sunum deneyimi:** Bu depo şu an oturum sonrası kullanılan ürün arayüzüdür; herkese açık tanıtım/plan/fiyat sayfaları ve ödeme altyapısı kapsamda değildir.

## Depo yapısı

- `src/app/`: sayfalar ve `/api/generate`, `/api/image` sunucu uçları
- `src/components/`: uygulama kabuğu (`AppShell`), tasarım sistemi (`Ui`, `Icons`), profil, üretici, görsel, takvim, kütüphane ve paylaşım arayüzleri
- `src/lib/`: Supabase erişimi, marka promptu, sağlayıcılar ve saf yardımcılar
- `schema.sql`: temel tablolar, ilişkiler, tetikleyiciler ve RLS politikaları
- `schema_v2_image_usage.sql`: görsel üretim kullanım kaydı
- `schema_v3_visual_storage.sql`: özel PNG deposu ve RLS politikaları
- `.env.example`: beklenen ortam değişkenleri için örnek
- `docs/platform-entegrasyon-plani.md`: platform API koşulları ve otomatik yayına geçiş planı
