# Aı Asisst — uçtan uca ürün durumu

## Mevcut tamamlanmış çekirdek

### Çok markalı çalışma alanı
- [x] Kullanıcı birden fazla marka oluşturabilir; AppShell seçicisinden marka değiştirebilir. Seçim kullanıcıya özgü yerel tercihte tutulur.
- [x] Profil, metin/görsel üretimi, Pixabay/GLB medya, takvim ve kütüphane sorguları aktif `business_id` ile filtrelenir; marka değişince önceki markanın içeriği ekranda tutulmaz.
- [x] Üretim ve medya API'leri marka kimliğini alır; sunucu marka sahipliğini doğrular. Eksik/geçersiz kimlik 400, erişilemeyen marka 404 döndürür.
- [x] Marka profili işletme/ürün/hedef kitle/marka dili bilgileri, iki marka rengi, renk oranı, logo ve sosyal hesap listesini saklar.

### Takvim ve manuel paylaşım
- [x] Takvim planı aktif markanın kayıtlı sosyal hesabına bağlanabilir; aynı platformdaki hesaplar kimlik ve kullanıcı adıyla ayırt edilir.
- [x] Kullanıcı “Paylaşıldı” durumunu kendisi kaydeder; `posted_at` zamanı ve isteğe bağlı HTTP(S) gönderi bağlantısı (`post_url`) tutulur.
- [x] Otomatik yayın eklenmedi. Hatırlatmalar uygulama içidir; e-posta/tarayıcı/push bildirimi gönderilmez.

### Veri bütünlüğü ve maliyet
- [x] Sosyal hesap eşitlemesi `sync_social_accounts` RPC'sinde atomiktir; doğrulama hatası eski hesapları silmez ve mevcut hesap kimliklerini/plan bağlantılarını korur.
- [x] Metin ve görsel üretim kotası DB advisory lock ile marka başına atomik rezerve edilir; başarısız istek rezervasyonu bırakır.
- [x] İçerik ve alt kayıtları DB'de birlikte silinir; özel Storage dosyası silinemiyorsa tekrar denenebilir kuyrukta kalır.
- [x] `visuals` Storage okuma/yükleme/silme politikaları `SECURITY DEFINER` sahiplik doğrulayıcısıyla kullanıcıya ait `business_id` klasörünü denetler; güncel v3 betiği bucket ve üç policy'yi idempotent biçimde kurar.
- [x] `schema_v2_image_usage.sql` policy'si ve yeni v5 migration tekrar çalıştırılabilir biçimdedir.

### UX, erişilebilirlik ve kalite
- [x] Kütüphanede güncel metin taslağı paylaşım kopyasına yansır; içerik düzenleme ve medya işlemleri aktif markayla sınırlıdır.
- [x] Görsel stüdyosu PNG'si Bearer oturumu ve marka sahipliğini doğrulayan `/api/media/library` ile 12 MB sınırında kaydedilir.
- [x] PNG API'si dosya imzası, CRC/decode, çözünürlük ve boyut sınırını uygular.
- [x] Tema kontrastı, canvas metinsel alternatifi, klavye odağı ve medya sekmelerinin erişilebilir gezinimi iyileştirilmiştir.
- [x] Node `22.23.4` sabitlenmiş; Vitest, `npm test`, `npm run typecheck` ve README kurulum/migration bilgileri eklenmiştir.
- [x] Önceki iterasyonda lint, TypeScript, birim testleri ve production build doğrulanmıştır.

## Bu çalışma kapsamında teslim edilen ürün çıktıları

### İşletme ana ekranı ve marka ayarları
- [x] `/` kullanıcı için seçili markanın iş özeti olur; sıradaki ve gecikmiş manuel yayın planlarını, taslak/onaylı içerik sayılarını ve yakın tarihli içeriği veritabanındaki gerçek kayıtlarından gösterir; takip edilmeyen sosyal erişim/performans metriği uydurmaz.
- [x] Marka oluşturma ve profil düzenleme `/marka` alanında kalır; gezinme, aktif marka seçimi, ilk marka oluşturma bağlantıları, sayfa başlığı ve no-brand durumları yeni rota ile tutarlı çalışır. Eski `/profil` adresi geriye dönük uyumluluk için `/marka`'ya yönlendirilir.
- [x] Dashboard hızlı eylemleri aktif `business_id` bağlamını korur ve manuel yayın sınırını görünür tutar.

### Kaynaklı ürün yönü
- [x] En az beş benzer ürün resmi/ürün kaynaklarından incelenir; raporda ürün başına doğrulanmış kaynak bağlantısı ve ürün akışlarına dayalı karşılaştırma bulunur.
- [x] Pazar/ürün belgesi benzer araçların varlığını doğrulanmış kaynaklarla anlatır; doğrulanmamış fiyat veya pazar büyüklüğü iddiası içermez ve manuel yayın kararını korur.

## Denetimde açık kalan ürün ve teknik sonuçlar

### Güvenli profil ve takvim kurtarma
- [x] Profil verisi yükleme hatasında form boş/varsayılan verilerle kaydedilemez; belirgin yeniden dene/kurtarma durumu gösterilir.
- [ ] Profil değişiklikleri varken yeni marka veya başka marka seçimi form taslağını sessizce kaybettirmez.
- [x] Takvim zorunlu sorgularından biri başarısız olursa eksik sonuçlar “boş takvim” gibi gösterilip yeni kayıt formu etkinleştirilmez; tekrar yükleme sağlanır.
- [ ] Takvim hedef hesabı boşaltıldığında eski platform değeri sessizce kalmaz; platform/hesap davranışı açık ve tutarlıdır.

### İçerik yaşam döngüsü
- [x] Üretim sonucu düzenlenebilir veya kütüphanedeki aynı kayda belirgin bağlantı taşır; kullanıcı düzenlenmiş sürümü yanlışlıkla başka kayda kopyalamaz.
- [ ] İçerik ID/marka bağlamı, üretimden görsel stüdyosuna ve takvime geçerken korunur; ilişkisiz ikinci kayıt izlenimi oluşturulmaz.
- [ ] Kütüphane ve takvim/medya içerik seçicilerindeki 200/100 sonuç limitleri görünür ve eski kayıtları arama/sayfalama yoluyla bulmaya elverişlidir.
- [ ] Manuel paylaşım checklist'i içerik ve medya indirme/kopyalama, platformda kullanıcı tarafından yayınlama ve takvimde işaretleme adımlarını netleştirir.

### API, storage ve migration güvenliği
- [x] Pixabay görsel indirme yönlendirmeleri sunucu tarafı SSRF savunmasını aşamaz; hedef host/şema her hop'ta denetlenir ya da yönlendirme tamamen reddedilir.
- [ ] Medya arama ve upload uçları kullanıcı başına maliyet/kötüye kullanım kotasıyla korunur; üretim DB'sine bağlı staging/live test olmadan limitin dağıtık güvenilir olduğu iddia edilmez.
- [ ] İçerik parent ilişkisi döngü oluşturamaz ve recursive silme döngüde takılmaz.
- [ ] Upload başarıp DB insert başarısız olduğunda dosya temizliği güvenilir tekrar denemeye alınır; temizlik hatası gözlemlenebilir.
- [ ] CI/health-check Supabase migration sürümü ile uygulamanın ihtiyaç duyduğu RPC/kolonlar arasındaki eksikliği erken ve anlaşılır biçimde yakalar.
- [ ] Route auth/ownership, hata telafisi, migration zinciri/RLS ve hassas negatif senaryolar için test kapsamı eklenir.

## Canlı veritabanında bekleyen doğrulama

- [ ] Kullanıcının Supabase staging ortamında v2, güncel v3, v4, v5 ve v6 migration sırasını, tekrar uygulanabilirliği, iki kullanıcıyla RLS izolasyonunu, eşzamanlı kota yarışını ve Storage hata telafisini doğrulayın. Bu depo oturumunda canlı/staging veritabanına yazma yapılmamıştır; canlı schema durumu bilinmiyor.
