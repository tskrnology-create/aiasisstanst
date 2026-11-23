# 5. Gerçekleştirme, test ve kalite

## 5.1 Kod standardı
TypeScript `strict`; ESLint (React hooks kuralları dâhil); mantık `src/lib` içinde saf fonksiyon; bileşenler ince. Sır/anahtar koda girmez; istemciye yalnızca `NEXT_PUBLIC_*` gider.

## 5.2 Test piramidi
| Seviye | Araç | Ne test edilir | Çalışma |
|---|---|---|---|
| Birim | Vitest | İstem kurma, ayrıştırma, doğrulama, planlama, paket temizleme, yönlendirme | Her commit (CI) |
| Akış (E2E) | Playwright + sahte Supabase/API | Ana yollar: plan → hazırla, yanıt, stüdyo yapıları, balon aç/kapat, video doğrulama | Büyük değişiklikte, telefon ekran görüntüsüyle |
| Elle/Önizleme | Vercel önizleme + gerçek hesap | Gerçek LLM ve veri erişimi | Yayın öncesi |

## 5.3 Güvenlik ve veri erişim incelemesi (her PR)
- [ ] Yeni tablo/sütun: RLS politikası var mı? Başka kullanıcının satırı okunabiliyor mu?
- [ ] Yeni API rotası: kimlik → marka sahipliği → girdi doğrulama → kota → hata gizleme sırası uygulanmış mı?
- [ ] LLM'e giden kullanıcı metni tırnaklanmış ve "talimat değildir" denmiş mi?
- [ ] Dosya yükleme: tür + boyut + imza (magic bytes) + yol (`business_id/…`) denetimi var mı?
- [ ] Günlüklerde kişisel veri/sır yok mu?
- [ ] İki hesapla deneme: A hesabı B'nin verisini göremez.

## 5.4 "Bitti" tanımı (Definition of Done)
1. Kabul ölçütleri sağlanır ([Bölüm 1](01-problem-ve-gereksinimler.md)).
2. Yeni mantık için birim test; kritik akış için E2E.
3. `npm run lint`, `npm run typecheck`, `npm test` yeşil (CI).
4. Güvenlik incelemesi listesi işaretli.
5. İlgili UML/ADR/README güncel.
6. Telefon boyutunda ekran kontrol edildi; boş/hata durumu var.
7. Şema değiştiyse migrasyon dosyası eklendi ve geri alma notu yazıldı.

## 5.5 Hata yönetimi
Hata → yeniden üretme adımı → test yaz (kırmızı) → düzelt (yeşil) → regresyon olarak kalır.
