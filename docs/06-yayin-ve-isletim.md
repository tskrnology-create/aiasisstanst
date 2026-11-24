# 6. Yayın, işletim ve yol haritası

## 6.1 Ortamlar
| Ortam | Amaç | Not |
|---|---|---|
| Yerel | Geliştirme (`npm run dev`) | Sahte/ayrı Supabase projesi önerilir |
| Önizleme | Her PR için Vercel önizlemesi | Gerçek akış denemesi |
| Üretim | `main` → Vercel | Yayın sonrası duman testi |

## 6.2 CI/CD
`.github/workflows/ci.yml`: her push/PR'de `lint → typecheck → test → build`. Başarısız CI birleştirmeyi engeller (dal koruması açılmalıdır).

## 6.3 Sürüm ve migrasyon
- Şema değişikliği **ayrı SQL dosyası** (`schema_vN_*.sql`), idempotent (`if not exists`).
- Sıra: önce geriye uyumlu migrasyon → sonra kod → gerekirse eski sütunu sonra kaldır.
- Geri alma: kod için önceki Vercel dağıtımına dön; şema için yeni (ileri) düzeltme migrasyonu.
- **Bekleyen:** `schema_v7_hardening_and_account.sql`, `schema_v8_post_packages.sql`, `schema_v9_brand_ratio_and_visual_cleanup.sql`, `schema_v10_post_results.sql` üretimde sırayla çalıştırılmalı.

## 6.4 Gözlem
Sunucu günlüğü (Vercel), Supabase günlükleri; izlenecekler: üretim hata oranı, 429 oranı (kota), yanıt süresi. Sır/kişisel veri günlüğe yazılmaz.

## 6.5 Risk kaydı
| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| LLM maliyeti/kota aşımı | Orta | Yüksek | Marka başına saatlik kota, zincirde yedek sağlayıcı |
| Model hatalı/uydurma bilgi | Yüksek | Orta | Profil dışı olgu uydurma yasağı, düzenleme zorunlu adım, kontrol listesi |
| Veri sızıntısı (RLS hatası) | Düşük | Çok yüksek | RLS + API sahiplik kontrolü + iki hesap testi |
| Prompt enjeksiyonu (yorum/DM/sohbet) | Orta | Orta | Girdiyi veri olarak tırnaklama, çıktıyı doğrulama |
| Telif (müzik/görsel) | Orta | Orta | Gömme yok; lisans notu; kendi dosyada sorumluluk kullanıcıda |
| Sağlayıcı kesintisi | Orta | Orta | Çoklu sağlayıcı zinciri; anlaşılır hata |
| Video servisi gecikmesi | Yüksek | Düşük | Arayüz hazır, kapalı; bağlanınca açılır |

## 6.6 Yol haritası
1. **Şimdi:** plan, hazırla, düzenle, yanıtla, görsel/video/müzik yapıları.
2. **Yapıldı:** performans girişi (beğeni/yorum/kaydetme, `calendar_items` sütunları, schema v10) ve Ana sayfada "Neler işe yarıyor?" özeti (`src/lib/performance.ts`, en az 3 sonuç).
3. **Sonraki:** haftalık özet, otomatik paylaşım (Meta/TikTok incelemesi sonrası).
3. **Sonra:** AI video sağlayıcısı bağlama (kuyruk + iş durumu), toplu aylık plan, ekip/ajans rolleri ve onay akışı.
4. **Hesap bağlama ve otomatik yayın (ön koşullar):** Meta uygulaması + uygulama incelemesi (Instagram içerik yayını izni), Instagram işletme hesabı + Facebook sayfası, OAuth akışı, şifreli token saklama (sunucu tarafı, RLS dışı erişim yok), yenileme ve iptal akışı, TikTok için ayrı geliştirici onayı. Bunlar tamamlanmadan kod yazmak yerine «Paylaş» menüsü kullanılır.
