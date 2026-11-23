# 4. Tasarım süreci (UX/UI)

## 4.1 Süreç
1. **Anlama:** kişiler ve acılar ([Bölüm 1](01-problem-ve-gereksinimler.md)).
2. **Görev analizi:** kullanıcının günlük işi → *Planla → Hazırla → Paylaş → Yanıtla*.
3. **Bilgi mimarisi:** beş sekme; her sekme tek soruya cevap verir.
4. **Akış taslağı:** etkinlik diyagramı ([UML 2.6](02-uml.md)).
5. **Telefon-öncelikli uygulama:** önce 390 px; sonra geniş ekran.
6. **Doğrulama:** her değişiklikte telefon boyutunda ekran görüntüsü + Playwright akış testi; erişilebilirlik kontrol listesi.

## 4.2 Bilgi mimarisi
| Sekme | Soru | İçerik |
|---|---|---|
| Ana sayfa | "Bugün ne yapmalıyım?" | Haftayı planla, sıradaki adım, hafta şeridi, özel günler |
| Stüdyo | "Ne hazırlayacağım?" | Metin · Görsel · Metin+Görsel · Video · Yanıtla |
| Hafta | "Bu hafta ne var?" | Planlama, günlük liste, Hazırla / Paylaşıldı |
| İçerikler | "Ne üretmiştim?" | Liste, takvim, düzenleme |
| Marka | "Ben kimim?" | Profil, renk, logo, hesaplar |
| (Balon) Asistan | "Bir şey sorabilir miyim?" | Marka profilini bilen sohbet |

İlke: **her ekranda tek birincil eylem**; seçenek sayısı azaltılır, ileri ayarlar gizlenir.

## 4.3 Tasarım sistemi
- **Renk:** sıcak krem zemin, mercan marka rengi, turkuaz vurgu; açık/koyu tema belirteçleri `globals.css` içinde (`--brand`, `--surface`, `--ink` …). Renk anlamı yalnızca renge bağlanmaz (metin/ikon eşlik eder).
- **Tipografi:** Plus Jakarta Sans; başlıklar kalın, gövde 14–16 px.
- **Biçim:** büyük yuvarlak köşe, yumuşak gölge, yüzen pil menü (mobil).
- **Bileşenler:** `Ui.tsx` (Button, Chip, SectionCard, Callout, Tag…) — yeni ekran yeni bileşen yazmadan önce bunları kullanır.
- **Hareket:** kısa giriş animasyonları; `prefers-reduced-motion` ile kapanır.

## 4.4 Erişilebilirlik kontrol listesi
- [ ] Her form alanının etiketi var (görünür ya da `sr-only`).
- [ ] Etkileşimli öğeler klavye ile erişilir; odak halkası görünür.
- [ ] Hata mesajları `role="alert"`; canlı sonuçlar `aria-live`.
- [ ] Kontrast ≥ 4.5:1 (metin), dokunma hedefi ≥ 40 px.
- [ ] Görsellerde alternatif metin.

## 4.5 Boş / hata / yükleniyor durumları
Her ekran üç durumu tasarlar: **boş** (ne yapılacağını söyler), **yükleniyor** (yer tutucu), **hata** (ne oldu + tekrar dene). Üretimde kaybolan iş olmaz: üretim başarısızsa kota geri verilir.
