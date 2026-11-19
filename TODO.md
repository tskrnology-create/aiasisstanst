# Aı Asisst — uçtan uca iyileştirme durumu

## Çok markalı çalışma alanı

- [x] Kullanıcı birden fazla marka oluşturabilir; AppShell seçicisinden marka değiştirebilir. Seçim kullanıcıya özgü yerel tercihte tutulur.
- [x] Profil, metin/görsel üretimi, Pixabay/GLB medya, takvim ve kütüphane sorguları aktif `business_id` ile filtrelenir; marka değişince önceki markanın içeriği ekranda tutulmaz.
- [x] Üretim ve medya API'leri marka kimliğini alır; sunucu marka sahipliğini doğrular. Eksik/geçersiz kimlik 400, erişilemeyen marka 404 döndürür.

## Takvim ve manuel paylaşım

- [x] Takvim planı aktif markanın kayıtlı sosyal hesabına bağlanabilir; aynı platformdaki hesaplar kimlik ve kullanıcı adıyla ayırt edilir.
- [x] Kullanıcı “Paylaşıldı” durumunu kendisi kaydeder; `posted_at` zamanı ve isteğe bağlı HTTP(S) gönderi bağlantısı (`post_url`) tutulur.
- [x] Otomatik yayın eklenmedi. Hatırlatmalar uygulama içidir; e-posta/tarayıcı/push bildirimi gönderilmez.

## Veri bütünlüğü ve maliyet

- [x] Sosyal hesap eşitlemesi `sync_social_accounts` RPC'sinde atomiktir; doğrulama hatası eski hesapları silmez ve mevcut hesap kimliklerini/plan bağlantılarını korur.
- [x] Metin ve görsel üretim kotası DB advisory lock ile marka başına atomik rezerve edilir; başarısız istek rezervasyonu bırakır.
- [x] İçerik ve alt kayıtları DB'de birlikte silinir; özel Storage dosyası silinemiyorsa tekrar denenebilir kuyrukta kalır.
- [x] `schema_v2_image_usage.sql` policy'si ve yeni v5 migration tekrar çalıştırılabilir biçimdedir.

## UX, erişilebilirlik ve kalite

- [x] Kütüphanede güncel metin taslağı paylaşım kopyasına yansır; içerik düzenleme ve medya işlemleri aktif markayla sınırlıdır.
- [x] Görsel stüdyosu PNG'si doğrudan tarayıcı Storage yüklemesi yerine Bearer oturumu ve marka sahipliğini doğrulayan `/api/media/library` ile 12 MB sınırında kaydedilir; Storage izin reddi `DEPO_IZIN_400` için uygulanacak migration'ları açıkça gösterir.
- [x] PNG kaydetme API'si dosya imzasına ek olarak CRC/decode, desteklenen 2.5 MP çözünürlük sınırı ve 12 MB boyut kontrolü uygular; başarısız kayıt sonrası Storage temizliği başarısız olursa dosya yolu bildirilir.
- [x] Açık/koyu temada `text-faint` tokenı normal metin için ana yüzeylerde WCAG AA kontrastını sağlar; canvas alternatif metni dinamik; dosya seçicide klavye odağı görünür; medya sekmeleri ok/Home/End ile gezilebilir ve seçili paneli ARIA ile ilişkilidir.
- [x] Node `22.23.4` `.nvmrc` ile sabitlenmiş ve `engines` ile sınırlandırılmıştır; Vitest, `npm test`, `npm run typecheck` komutları eklenmiştir.
- [x] README ve Pixabay/entegrasyon notları migration sırası, aktif marka, medya sınırları ve manuel yayın davranışıyla güncellenmiştir.
- [x] Yerel doğrulama: lint, TypeScript, 16 birim testi, üretim build'i ve Git diff kontrolü.

## Canlı veritabanında bekleyen doğrulama

- [ ] Kullanıcının Supabase staging ortamında v2–v5 migration sırasını uygulayıp tekrar çalıştırma güvenliğini, iki kullanıcıyla RLS izolasyonunu, eşzamanlı kota yarışını ve Storage hata telafisini doğrulayın. Bu depo oturumunda canlı/staging veritabanına yazma yapılmadı.
