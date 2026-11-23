# 3. Mimari ve karar kayıtları

## 3.1 Katmanlar
| Katman | Yer | Sorumluluk | Kural |
|---|---|---|---|
| Sunum | `src/app`, `src/components` | Sayfalar, formlar, durum | İnce tutulur; iş kuralı içermez |
| Alan mantığı | `src/lib/*.ts` | İstem kurma, yanıt doğrulama, planlama, güvenlik süzgeçleri | Saf fonksiyon, **birim testli**, ağ/DB çağırmaz |
| API | `src/app/api/*` | Kimlik, marka sahipliği, kota, LLM/Pixabay çağrısı | Her rota: doğrula → sahiplik → kota → işle → hata gizle |
| Veri | Supabase (Postgres + RLS + Storage) | Kalıcılık, erişim denetimi | Tüm tablolarda RLS; Storage özel; migrasyon dosyalı |

## 3.2 Güven sınırları
1. Tarayıcı güvenilmezdir: her girdi sunucuda yeniden doğrulanır (uzunluk, sabit liste, UUID).
2. LLM çıktısı güvenilmezdir: JSON ayrıştırılır, alan alan sınırlanır; geçersizse reddedilir.
3. Kullanıcı/müşteri metni (yorum, DM, sohbet) **veridir, talimat değildir**; istemde tırnaklanır ve bu açıkça belirtilir.
4. Asistan yalnızca herkese açık profil alanlarını görür; e-posta, kimlik, token, ödeme hiç gönderilmez.

## 3.3 Karar kayıtları (ADR)
| ADR | Karar | Gerekçe | Sonuç / ödünleşim |
|---|---|---|---|
| 1 | Next.js + Vercel + Supabase | Küçük ekip, tek repo, hızlı yayın, yönetilen Auth/DB | Sunucusuz zaman aşımı sınırları (video işleri için kuyruk gerekir) |
| 2 | RLS her tabloda; API de sahipliği ayrıca doğrular | Çift savunma | Biraz tekrar, güvenlik kazancı |
| 3 | LLM zinciri (Gemini → DeepSeek → OpenAI) | Kota/kesinti dayanıklılığı, maliyet | Çıktı biçimi farklılaşır → sıkı ayrıştırıcı şart |
| 4 | **Otomatik yayın yok**, manuel paylaşım + hatırlatma | Platform politikası, hesap güvenliği, sorumluluk | Kullanıcı bir adım yapar; güven artar |
| 5 | İçerik = `package` jsonb + eski düz sütunlar (`packageToLegacy`) | Eski ekranlar bozulmadan yeni format modeli | Kayıt iki yerde; tek fonksiyonla senkron tutulur |
| 6 | Plan satırı = taslak içerik + takvim kaydı (yer tutucu) | Şema değişikliği gerektirmez | Üretimde satır yeniden bağlanır, yer tutucu silinir |
| 7 | Büyük dosyalar (video) istemciden doğrudan özel Storage'a | Vercel gövde sınırı (~4.5 MB) | Doğrulama istemcide + RLS'li depo ilkeleri |
| 8 | AI video üretimi arka uçta sağlayıcı arayüzüyle, şimdilik kapalı | Sağlayıcı seçimi sürüyor | Arayüz hazır; bağlanınca yalnızca `dispatch` dolar |
| 9 | Canva şablonları kullanılmaz; kendi Canva-tarzı şablon seti | Canva şablonlarına programatik erişim/lisans yok | Şablon sayısı bizim sorumluluğumuzda |
| 11 | «Paylaş» = cihazın Web Share menüsü (görsel + metin hazır); gerçek otomatik yayın sonraya | Meta/TikTok yayın API'leri uygulama incelemesi ve işletme hesabı ister; token saklama güvenlik tasarımı gerekir | Kullanıcı son dokunuşu yapar; hesap bağlama yol haritasında |
| 10 | Telifli müzik gömülmez; öneri + kullanıcının kendi dosyası | Telif riski | Müzik platformda yayın anında eklenir |

## 3.4 Hata ve kota politikası
- Kota: `reserve_generation` ile **önce rezerve**, başarıyla biterse tüket, aksi halde `release_generation`.
- Kullanıcıya düz Türkçe hata; teknik ayrıntı yalnızca sunucu günlüğünde (`publicTextError`).
