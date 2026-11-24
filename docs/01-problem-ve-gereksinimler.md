# 1. Problem ve gereksinimler

## 1.1 Problem tanımı
Küçük işletmeler ve bireysel içerik üreticileri sosyal medyayı **düzenli, markaya uygun ve az zamanla** yönetmekte zorlanır. Sektör araştırmaları aynı sorunları tekrarlar: tutarlı paylaşım, ne paylaşacağını bulma, zaman kıtlığı, dağınık iş akışı ([HubSpot](https://blog.hubspot.com/marketing/social-media-challenges?src=feed), [Sprout Social](https://sproutsocial.com/insights/social-media-marketing-problems/)).

**Ürün hedefi:** "Ne paylaşacağım?" sorusunu, tek akışta *planla → hazırla → paylaş → yanıtla* ile, markanın sesini bozmadan, günde birkaç dakikaya indirmek.

**Kapsam dışı (bilinçli):** otomatik yayın (platform politikası ve hesap güvenliği), telifli müzik dağıtımı, sahte etkileşim.

## 1.2 Kişiler (persona)
| Kişi | Durum | En büyük acı |
|---|---|---|
| **Esnaf / küçük işletme sahibi** (örn. telefon tamircisi) | Tek başına, dar zaman | Ne paylaşacağını bilememek, düzensizlik |
| **Bireysel üretici / freelancer** | Kişisel marka | Fikir tükenmesi, görsel hazırlama yükü |
| **Küçük ajans çalışanı** | 3–10 marka | Markalar arası geçiş, ton tutarlılığı, hızlı teslim |

## 1.3 Kullanıcı hikâyeleri ve kabul ölçütleri (MoSCoW)
| # | Öncelik | Hikâye | Kabul ölçütü |
|---|---|---|---|
| US-1 | Must | Hesap açıp giriş yapmak istiyorum | E-posta ile kayıt/giriş/şifre sıfırlama; hesap silme ve veri indirme çalışır |
| US-2 | Must | Markamı (ad, sektör, ürün, kitle, ses, renk, logo) tanımlamak istiyorum | Profil kaydedilir; birden çok marka arasında geçiş yapılır; veriler markaya göre ayrılır |
| US-3 | Must | Haftayı tek tıkla planlamak istiyorum | 3/5/7 paylaşımlık öneri gelir; seçilenler takvime yer tutucu olarak eklenir |
| US-4 | Must | Plandaki fikirden yazı hazırlamak istiyorum | "Hazırla" Stüdyo'yu fikir+platform dolu açar; üretilen içerik plan satırına bağlanır |
| US-5 | Must | Metni yapay zekâ yazsın **ya da** ben yazayım | İki yol da kütüphaneye taslak olarak düşer |
| US-6 | Must | Oluşan içeriği düzenleyebilmeliyim | Üretim kartında kanca/gövde/çağrı/hashtag/slayt/sahne düzenlenip aynı kayda kaydedilir; kendi metni de aynı kayıt üzerinden güncellenir; Birlikte akışında «Düzenle» adımı vardır |
| US-7 | Must | Platforma uygun format ve kurallarla içerik istiyorum | Format ve platform seçimine göre paket (gönderi/karusel/hikâye/video/metin); kontrol listesi gösterilir |
| US-8 | Should | Görseli üretmek/yüklemek/Pixabay'dan seçmek ve şablona koymak istiyorum | Şablon önizlemesi; PNG kütüphaneye özel depoya kaydedilir; yazı isteğe bağlı |
| US-9 | Should | Video için görsel+metin vererek video üretmek veya kendi videomu yüklemek istiyorum | En az 3 görsel+metin doğrulanır (üretim servisi bağlanınca çalışır); MP4/WebM yükleme ve önizleme çalışır |
| US-10 | Should | Gelen yorum/DM'e marka sesiyle yanıt almak istiyorum | 3 seçenek; talimat enjeksiyonuna dayanıklı; fiyat/taahhüt uydurulmaz |
| US-11 | Should | Müzik eklemek istiyorum | Her stüdyoda isteğe bağlı: öneri tarzı veya kendi dosyam; telif uyarısı |
| US-12 | Should | Markamı bilen bir asistanla konuşmak istiyorum | Balon aç/kapat; yalnızca herkese açık profil bilgisi kullanılır |
| US-13 | Could | Performansı görmek istiyorum | Yapıldı: paylaşım sonrası beğeni/yorum/kaydetme girişi, en iyi platform ve gün dilimi özeti. Erişim ve haftalık özet sırada |
| US-14 | Won't | Otomatik yayın | Kapsam dışı |

## 1.4 Fonksiyonel olmayan gereksinimler
- **Güvenlik/gizlilik:** her tabloda RLS; API'lerde Bearer doğrulama ve marka sahipliği kontrolü; özel Storage; güvenlik başlıkları; yanıtlarda teknik ayrıntı gizlenir.
- **Maliyet kontrolü:** marka başına saatlik üretim kotası (atomik rezervasyon/serbest bırakma).
- **Erişilebilirlik:** klavye ile kullanım, etiketli kontroller, kontrast ≥ 4.5:1, azaltılmış hareket desteği.
- **Performans:** mobil öncelikli; ana sayfa tek veri çağrısı kümesiyle yüklenir.
- **Sürdürülebilirlik:** saf mantık `src/lib` içinde, birim testli; arayüz ince.
- **Yerelleştirme:** Türkçe öncelikli, içerik dili marka başına TR/EN.
