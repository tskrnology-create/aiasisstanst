# Aı Asisst: ürün yönü ve uygulama planı

## Ürün çerçevesi

Aı Asisst, KOBİ ve tek başına içerik üreten işletme sahiplerinin birden çok sosyal hesabı için marka bağlamını bir kez tanımlayıp içerik fikirlerini kampanyaya dönüştürebildiği, metni ve görseli düzenleyebildiği, taslakları saklayıp planladığı ve manuel yayın sonucunu takip edebildiği bir çalışma alanıdır. Kullanıcı “bugün ne hazırlamalı, sıradaki adım ne, hangi içeriği hangi marka ve hesap için planlamıştım?” sorularını yanıtlayabilmelidir. Ana fayda platform API'leri yerine hazırlık, yeniden kullanım, planlama ve takip işlerinin tek akışta toplanmasıdır.

Yayın bu aşamada daima kullanıcı tarafından elle yapılır. OAuth ile hesap bağlama, otomatik yayın, kullanıcı adına yorum/DM gönderme, ücretli sosyal yayın servisi eklenmez. Uygulama içi takvim ve elle işaretlenen yayın kaydı, gerçek bildirim veya otomatik yayın varmış gibi sunulmaz. Pixabay medya araması ve kullanımı, görsel editörü, video ve GLB/3D desteği korunur. Mevcut çoklu marka modeli, Next.js App Router + React + Tailwind ve Supabase Auth/PostgreSQL/Storage temel alınır; yeni sağlayıcı/altyapı icat edilmez.

Hedef kullanıcı ve temel iş: (1) ilk kez gelen küçük işletme sahibi marka, hedef kitle, teklif/ürün ve iki marka rengini girer; (2) ihtiyacını brief olarak yazar ve farklı platform alanları için metin üretir; (3) metni düzenleyip onaylar, görsel/video/3D medyayı iliştirir; (4) hedef sosyal hesabı ve zamanı seçerek takvime ekler; (5) metni kopyalayıp medyayı indirerek sosyal platformda kendisi paylaşır; (6) takvimde manuel olarak paylaşıldı işaretler ve isterse bağlantı kaydeder; (7) içerik ve kampanya materyallerini kütüphaneden bulup günceller veya tekrar kullanır.

## Ürün kararları ve yol haritası

- **Şimdi (bu çalışma):** ana ekranı işletme iş özeti hâline getirmek; marka profili/ayarlarını ayrı rotaya taşımak; yaklaşan planlar, yayın bekleyen/geciken işler ve kütüphane durumunu gerçek saklı veriden göstermek; doğru marka için hızlı eylemler sağlamak. Profil ve panel arasında kaybolmayı önlemek. Statik sayı/performans analitiği uydurmamak.
- **Çekirdek çalışma alanı:** her içerik, kampanya çıktısı, medya ve takvim planı seçilmiş marka kimliğiyle bağlanır. Mevcut akışları bir içerik kaydından düzenleme → görsel/medya → takvim → manuel paylaşım günlüğü yönünde bağlamak; veri ilişkisi sağlayan mevcut şema/kolon yoksa önce kontrollü migration tasarlamak. Yayın eylemleri açıkça manuel kalır.
- **Ölçekleme ve güvenilirlik:** kütüphanenin 200 kayıt ve plan seçicilerinin 100 kayıt sınırını aşan arama/sayfalama; Supabase şema sürüm sağlık kontrolü; medya aramasına ve upload'a maliyet kontrollü rate limit; görsel fetch yönlendirmelerini ve ebeveyn döngüsü riskini giderme; schema sürüm sırası ve RLS/API testlerini güçlendirme. Canlı Supabase durumuna ilişkin iddia, yalnız ayrı doğrulanmış gözleme dayanır.
- **Daha sonra, ürün sınırını koruyarak:** kullanıcı talebiyle ancak iş değeri gösterilirse e-posta/push bildirimleri, ekip rolleri, geniş analitik, platform OAuth'u veya otomatik yayın değerlendirilir. Bunlar mevcut aşamada taahhüt değildir ve bu görevde uygulanmaz.

## Araştırmaya dayalı ürün kararları

Buffer, Hootsuite, Later, Metricool ve Sprout Social'ın resmî belgeleri; otomatik yayınlama ile bildirimle/elle tamamlanan yayın arasındaki ayrımı, taslak ile tarih atanmış gönderi arasındaki farkı ve platform/format kabiliyetlerinin eşit olmadığını doğruluyor. Bu, kullanıcıların en çok zorlandığı konuların ölçülmüş sıklığı olarak sunulmuyor; belgelenmiş ürün davranışlarından çıkan tasarım gerekçesidir. Kaynaklar ve çıkarımlar [`docs/social-workflow-research.md`](docs/social-workflow-research.md) içinde.

Ürün, planlama kaydını yayın kanıtı saymaz. `Taslak`, `planlandı`, `manuel eylem bekliyor` ve `kullanıcı tarafından paylaşıldı olarak kaydedildi` ayrı durum anlamları taşır; paylaşım linki isteğe bağlıdır, kullanıcı bildirimi olarak kaydedilir ve platformdan doğrulanmış sayılmaz. Platform desteği ve biçim farklılıkları içerik üretiminde dikkate alınır; otomatik yayınlama bu MVP kapsamına alınmaz.

## Denetimde görülen başlıca boşluklar

1. `/` işletme paneli yerine marka profil formu olarak açılıyor; kullanıcıya sıradaki iş, planlar, gecikmeler ve durum özeti sunulmuyor.
2. Profil yükleme hatasında boş form açılıp kaydetmeye izin verilebiliyor; takvimde sorgu hatası varken boş veriyle form kullanılabiliyor.
3. Kütüphane son 200, takvim ve medya seçicileri son 100 içerikle sınırlı; eski içerikler aranıp seçilemiyor.
4. Üretim/görsel/takvim geçişi içeriğin kimliğini/bağlamını kaybetmemeli; özellikle seçilmiş içerik için görsel kaydı yeni ve ilişkisiz içerik oluşturmamalı.
5. Takvim hesap seçimi boşaltılırken eski platform kalabiliyor; uzun bekleme sonrası planlanan metnin hangi sürümü olduğu açık değil.
6. Medya API'lerinde dağıtık kullanıcı kotası görünmüyor; Pixabay görsel indirme yönlendirmesinde SSRF savunması güçlendirilmeli; v1 SQL başlangıç migration'ı tekrar uygulanmaya uygun değil.
7. Profildeki değişiklikler marka değiştirirken sessizce kaybolabilir; upload→DB iki adımlı başarısızlık yetim dosya bırakabilir. Bu veri-tutarlılığı sorunları açık kalan işler olarak takip edilir.

## Uygulama ve tasarım yaklaşımı

- **Mimari:** Next.js App Router sayfaları erişim kapısı üzerinden çalışır. İstemci bileşenleri seçili marka bağlamını `BusinessContext` ile alır. Supabase sorguları `business_id` ile filtrelenir ve RLS'ye tabidir. Harici üretim/medya API'leri kullanıcı JWT'si ve sunucu tarafı sahiplik denetimiyle çalışır. UI ürün kararlarının sahibi `src/components`; domain yardımcıları `src/lib`; DB kuralları sıralı `schema*.sql` dosyalarıdır.
- **Ana modüller:** `/` iş özeti; `/marka` marka profili ve sosyal hesaplar; `/studyo` tek içeriğin Yaz → Düzenle/onayla → isteğe bağlı Görsel/medya → Planla akışı (metin, alternatifler, görsel stüdyosu, Pixabay/Video/GLB; adım ve `content` kimliği URL'de); `/icerikler` Liste (düzenleme, onay, arşiv, tekrar kullanım) ve Takvim (manuel paylaşım planı ve işaretleri) görünümleri. Kanonik kullanıcı yolu `docs/content-lifecycle.puml` UML aktivite diyagramında tutulur; gezinme ve ana CTA'lar bu sırayı yansıtmalıdır. Haftalık AI fikir planı ikincil araçtır. Eski `/uret`, `/gorsel`, `/takvim`, `/kutuphane` kalıcı yönlendirilir.
- **Tasarım:** mevcut aydınlık/koyu tema, marka rengi, Inter tipografisi, kartlar, Tailwind tokenları ve Türkçe arayüz korunur. Stil, profesyonel işletme çalışma alanı ile sıcak editoryal stüdyo arasında; görsel hiyerarşi ile iş sırasını öne çıkarır. İlkeler: veri doğru kaynağından, marka bağlamı görünür, birincil sonraki adım belirgin, manuel işlem şeffaf. Ana palet yüzey/nötr tonlar ve kullanıcının seçtiği marka rengi; aksan yalnızca eylem ve durum sinyalleri için kullanılır. Ekranlar kartı yoğunlaştırmak yerine görev odaklı bölümler ve anlamlı boş durumlar kullanır. İnce hover/focus/başarı geçişleri 150–220 ms; durum değişiminde motion azaltma tercihi gözetilir. Sayfa başlıkları ve CTA'lar sade, Türkçe, iş odaklı olur (“Sıradaki paylaşım”, “İçeriğe devam et”). Wordmark mevcut “Aı” işareti ve isimdir; yeni logo/illüstrasyon üretilmez.
- **Güvenlik/veri:** RLS ve business ownership korunur; Supabase service-role sırrı istemciye verilmez; medya biçim/yanıt/sınır kontrolleri korunur; hatalar kullanıcıya anlaşılır ve sunucuya güvenli loglanır. DB migration'ı kullanıcı onayı ve canlı schema durumu doğrulanmadan üretim DB'sine uygulanmaz.
- **Kısıt:** hiçbir değişiklik, UI'da veya API'de otomatik sosyal yayın başlatmayacak; bildirim yalnız gerçekten uygulanmış/aktif kanal varsa vaat edilebilir.

## Proje yapısı

- `src/app`: sayfa rotaları ve API uçları. `/` dashboard ve `/marka` profil sayfası birbirinden ayrılır.
- `src/components`: AppShell/BusinessContext, dashboard, profil, metin üretici, görsel stüdyosu, takvim, medya seçici, kütüphane ve ortak UI.
- `src/lib`: Supabase erişimi, marka deposu, takvim ve kütüphane dönüşümleri, medya/doğrulama ve saf domain kuralları.
- `schema.sql`, `schema_v2_*` … `schema_v9_*`: kullanıcı Supabase ortamına sıralı uygulanan tablolar, RLS, fonksiyonlar ve storage politikaları. v9 bu görevde hazırlanmış, canlıya uygulanmamıştır.
- `docs`: kaynaklı rakip araştırması ve karar gerekçeleri.

## Kalite ve teslimat

Mevcut `npm run lint`, `npm run typecheck`, `npm test` ve `npm run build` komutları çalıştırılır. Test verisiyle işlevsel yardımcılar ve yeni risk düzeltmeleri kapsanır. Temiz çalışma ağacından sonra uygun değişiklikler `origin/main` üzerine birleştirilerek checkpoint commit/push edilir. Canlı Supabase migration/RLS doğrulaması bu sandbox'tan yapılmış gibi gösterilmez.
