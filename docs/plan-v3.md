# Plan v3: "İçerik Motoru"

Tarih: 2026-11-25. Bu plan koddan önce yazıldı; kod bu sıraya ve kabul ölçütlerine uyar.

## 1. Araştırma özeti
Kaynaklar: [HubSpot 2026 sosyal medya sorunları](https://blog.hubspot.com/marketing/social-media-challenges), [Metricool 2026 zorlukları](https://metricool.com/challenges-of-social-media-metricool/), [Buffer, Later, Metricool karşılaştırması](https://buffer.com/resources/buffer-vs-metricool/).

| Sorun | Kanıt | Bizim cevabımız |
|---|---|---|
| Düzenli ve yeterli içerik üretmek | HubSpot: pazarlamacıların yarıdan fazlası en büyük sorun diyor | Haftalık plan + tek tıkla hazırlama |
| Fikir bulmak | Metricool: en çok anılan baskılardan biri | Fikir bankası ve içerik sütunları |
| Yapay zeka yığınında sıyrılmak, insan sesi | Metricool: özgünlük belirleyici | Ses örnekleri: kullanıcının eski paylaşımlarından üslup |
| Platforma göre uyarlama | Metricool: her platformun biçimi ve saati farklı | Platform paketleri (var), en iyi saat önerisi (var) |
| Sonucu kanıtlamak | HubSpot: ROI'yi göstermek zor | Sonuç girişi ve "neler işe yarıyor" (var), haftalık özet (yeni) |
| Uyum | Metricool: YZ içerik beyanı | İçerik başına "yapay zeka yardımı" işareti |

Rakipler (Buffer, Later, Metricool) planlama ve analizi iyi yapar; içeriği markanın sesiyle sıfırdan üretmek zayıf alandır. Ürünün farkı budur.

## 2. Kullanıcı ve ana akış
Tek kişi ya da küçük işletme, telefondan. Akış: **Marka sesi kur (bir kez) → Haftayı planla → Hazırla → Düzenle → Paylaş → Sonucu gir → Haftalık özet**.

## 3. Kapsam (fazlar)
- **Faz 1 (bu sürüm): Marka sesi ve içerik sütunları.** Kullanıcı 3 sütun (ör. ürün, ipucu, hikâye) ve en çok 5 ses örneği girer. Plan ve içerik üretimi bunları kullanır. İçeriğe YZ işareti eklenir.
- **Faz 2:** Fikir bankası, haftalık özet.
- **Faz 3:** Otomatik paylaşım (Meta/TikTok incelemesi sonrası), AI video.

## 4. Veri şeması (schema_v11)
- `content_pillars(id, business_id, name, description, position)` en çok 6 satır/marka.
- `voice_samples(id, business_id, body, created_at)` 20–1500 karakter, en çok 5 satır/marka.
- `contents.ai_assisted boolean default true`.
- RLS: her tabloda sahiplik `businesses.owner_id = auth.uid()` ile; kullanıcı yalnız kendi markasının satırını görür ve yazar.

## 5. Kabul ölçütleri
1. Marka sayfasında sütun ve ses örneği eklenip silinebilir; sınırlar sunucu ve veritabanında zorlanır.
2. `/api/plan` ve `/api/generate` istemleri sütun ve ses örneklerini ekler; örnek metin talimat değil veri olarak işaretlenir (istem enjeksiyonuna karşı).
3. Her yeni birim davranışı için test var; tip, lint, test, derleme temiz.
4. Başka kullanıcının satırı okunamaz (SQL ile iki hesap testi: kullanıcıya bırakılır).
5. Mevcut akışlar bozulmaz.

## 6. Uygulama durumu (Faz 1)
- Yapıldı: şema v11, istemlere sütun ve ses örneği (`brand-prompt.ts`, etiket temizliği ve test), `getBusinessById` ile yükleme (tablolar yoksa üretim sürer), Marka sayfasında `VoicePanel`.
- Ertelendi: `ai_assisted` sütunu veritabanında var ama arayüz yazmıyor. v11 uygulanmadan yazarsak eklemeler hata verir; v11 uygulandıktan sonra açılacak.
- Doğrulanmadı: iki hesapla RLS testi ve ekran görüntüsü kontrolü.

## 7. Ürün tanımı (kullanıcıdan, 2026-11-25) ve karşılığı
Akış: işletme kayıt olur ve tüm platformlarını ekler → kendisi ya da yapay zeka platform niteliklerine göre içerik üretir → önizlemede en ince ayrıntıya kadar düzenler → Kaydet ile hafızaya alınır → İçeriklerim'de Paylaş ile istediği platforma paylaşır → her adımda yapay zeka asistan.

| Adım | Durum |
|---|---|
| Kayıtta platform ekleme | Marka formunun 3. bölümü; Ana sayfa hesap yoksa önce bunu ister |
| Platforma göre üretim | Platform kuralları (`platform-playbook.ts`); Oluştur ekranı yalnız eklenen platformları gösterir |
| Önizlemede ayrıntılı düzenleme | Metin alanları, şablon, fotoğraf, kapak başlığı/alt yazı/boyut/hiza/renk; yeniden üretime dönmeden |
| Kaydet | Oluştur'da "Kaydet" (içerik onaylı olarak saklanır) |
| İçeriklerim'de paylaş | Platform seçici yalnız eklenen platformları gösterir |
| Asistan | Sağ alttaki balon (var); adım içi öneriler sonraki iş |
| Otomatik paylaşım | Hâlâ yok: Meta/TikTok incelemesi gerekir |
