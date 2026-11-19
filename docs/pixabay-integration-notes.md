# Pixabay medya entegrasyonu — uygulama notları

## Resmî API kapsamı ve istek kuralları

Pixabay'ın geliştirici API'si belgelerinde fotoğraf/illüstrasyon araması için `GET /api/`, video araması için `GET /api/videos/` tanımlanıyor. Her iki arama da `q`, `page`, `per_page`, `safesearch` ve dil gibi parametreler alıyor. Belgelenen iki endpoint arasında 3D model araması bulunmuyor. Uygulamada görsel/video sonuçları için Pixabay API kullanılmalı; 3D dosyaları için resmi Pixabay 3D kataloğu harici arama ve dosya yükleme akışına yönlendirilmeli.

Pixabay varsayılan olarak API anahtarı başına 60 saniyede 100 istek sınırı bildiriyor ve API arama isteklerinin 24 saat önbelleklenmesini istiyor. Sonuçların gösterildiği arayüz Pixabay kaynak bilgisini göstermeli. Pixabay görsel URL'leri yalnızca arama sonuçlarını geçici göstermek için uygundur; görseli gerçek içerikte kullanmadan önce uygulama sunucusuna indirmek gerekir. Videolar uygulama içinde doğrudan gömülebilir; yine de saklamak önerilir.

Pixabay 3D kataloğu, 2025'te GLB/GLTF dosyaları için bir MVP olarak duyuruldu. Bu katalog geliştirici API dokümantasyonunda bir arama endpoint'i olarak sunulmadığı için HTML kazıma yapılmamalı; uygulama kullanıcıyı Pixabay 3D arama sayfasına yönlendirmeli ve indirilen GLB dosyasını kullanıcı onayıyla almalı.

İçerik lisansı ücretsiz kullanım ve uyarlamaya izin verir; ancak içeriği önemli ölçüde değiştirmeden tek başına yeniden dağıtmak yasaktır. Tanınabilir kişi, marka/logo veya mülkiyet içeren içeriklerde ek hakları değerlendirme sorumluluğu kullanıcıdadır. Bu nedenle kaynak/yaratıcı bilgisi arayüzde gösterilir ve kaynak sayfası kayda eklenir.

## Kaynaklar

- [Pixabay Developer API docs](https://pixabay.com/api/docs/)
- [Pixabay 3D models launch post](https://pixabay.com/blog/posts/3d-has-landed-on-pixabay-418/)
- [Pixabay Content License Summary](https://pixabay.com/service/license-summary/)


## Aktif marka ve güvenli kayıt akışı

Kullanıcının seçtiği marka `business_id` ile istemci sorgularına ve medya kayıt isteklerine eklenir. Marka seçimi yalnızca arayüz tercihi değildir: sunucu, oturum belirtecini doğruladıktan sonra marka sahipliğini RLS üzerinden tekrar kontrol eder. Storage RLS politikaları `schema_v3_visual_storage.sql` içindeki `SECURITY DEFINER` sahiplik yardımcısını çağırır; böylece Storage policy değerlendirmesi `businesses` tablosunun kendi RLS görünürlüğüne takılmaz. Pixabay görseli, GLB modeli ve üretilen içerik seçili markanın `business_id` değeriyle kaydedilir; eksik/geçersiz kimlik 400, erişilemeyen marka 404 ile reddedilir. Pixabay fotoğraf aramasında API anahtarı sunucuda kalır; GLB yüklemesi de aynı marka doğrulama akışından geçer.

Bu akış ve manuel paylaşım günlüğü için temel şemadan sonra `schema_v2_image_usage.sql`, `schema_v3_visual_storage.sql`, `schema_v4_media_library.sql` ve son olarak `schema_v5_workspace_and_manual_publishing.sql` uygulanır. v5 takvimde hedef sosyal hesap, gerçek yayın zamanı (`posted_at`) ve isteğe bağlı herkese açık gönderi URL'si (`post_url`) alanlarını ekler. Uygulama gönderiyi platforma kendisi yayımlamaz; kullanıcı platformun oluşturma ekranında manuel paylaşır ve takvimde kaydeder. v5 ayrıca sosyal hesapların atomik eşitlemesini ve özel Storage dosyaları için yeniden denenebilir temizleme kuyruğunu kurar.

## Görsel stüdyosu çıktısını kaydetme

Stüdyoda oluşturulan PNG, tarayıcıdan doğrudan Supabase Storage'a yazılmaz; `POST /api/media/library` uç noktası Bearer oturumunu doğrular, seçilen markanın kullanıcıya ait olduğunu RLS üzerinden kontrol eder, PNG imzası/CRC/decode doğrulaması yapar, 2,5 MP çözünürlük ve 12 MB dosya sınırını uygular, ardından dosya ile kütüphane kaydını oluşturur. Böylece tarayıcı Storage izni reddi yerine kayıt akışı sunucu tarafında tutarlı biçimde çalışır.

Uç nokta Storage yanıtında açık RLS/izin reddi metni görürse bunu `DEPO_IZIN_400` koduyla ve uygulanması gereken şemalarla bildirir; sıradan `400/403` durum kodları tek başına izin reddi sayılmaz. Bu hata sürerse projedeki güncel `schema_v3_visual_storage.sql` (sahiplik yardımcısı ve üç RLS politikasını yeniden kurar) ve ardından `schema_v4_media_library.sql` Supabase SQL Editor'de tekrar çalıştırılmalıdır; bu proje deposu kullanıcının Supabase veritabanına migration uygulamaz.
