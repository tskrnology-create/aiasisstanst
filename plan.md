# Aı Asisst uçtan uca iyileştirme planı

## Ürün çerçevesi

Aı Asisst; KOBİ'lerin ve markaların sosyal içerik hazırlama, takvimleme ve kütüphane işlerini tek yerde toplar. Sosyal ağlara yayın kullanıcı tarafından manuel yapılır. Bu işte otomatik yayın, OAuth ile hesap bağlama, ekip/rol altyapısı veya ücretli üçüncü taraf yayın servisi eklenmeyecek. Mevcut Next.js + Supabase mimarisi ve arayüz dili korunacak.

## Denetim bulgularına göre kapsam

1. **Aktif marka/işletme bağlamı:** `AppShell` içinde marka seçimi ve marka ekleme akışı; seçimin kullanıcıya özel saklanması; profil, üretim, görsel/medya, takvim ve kütüphane sorgularının seçilen işletmeyle sınırlandırılması. API istekleri işletme kimliği taşır ve sunucu kullanıcı sahipliğini doğrular.
2. **Manuel yayın iş akışı:** takvim planı bir kayıtlı sosyal hesaba (aynı işletmenin hesabı) bağlanabilir. Manuel olarak paylaşıldı işaretlendiğinde zaman ve isteğe bağlı herkese açık URL kaydedilebilir; otomatik gönderim yapılmaz. Hatırlatmanın uygulama içi olduğu açıkça yazılır.
3. **Veri tutarlılığı ve kota:** sosyal hesap listesinin kimliklerini koruyan atomik DB senkronizasyonu; metin/görsel üretim için eşzamanlı çağrılarda aşılmayan DB kota rezervasyonu; migration politikalarını tekrar çalıştırılabilir yapma. DB migration'ları kullanıcı Supabase ortamında ayrıca uygular.
4. **Düzeltmeler ve erişilebilirlik:** kütüphanede kaydedilmemiş metin taslağını kopyalama; düzenlemelerin doğru markaya ve bağlama yazılması; açık/koyu temada WCAG AA hedefli metin kontrastı; canvas için dinamik metinsel alternatif; gizli dosya seçicilerinde görünür klavye odağı.
5. **Kalite ve kurulum:** Node motor gereksinimi, `.nvmrc`, Vitest tabanlı saf yardımcı testleri ve `test`/`typecheck` komutları; kuruluma ve migration sırasına ilişkin README güncellemesi. İçerik/Storage silme telafisi ve diğer bilinen teknik riskler de uygulanabilir güvenli düzeltmelerle ele alınır veya kalan sınırlama olarak belgelenir.

## Proje yapısı ve değişiklik noktaları

- `src/components/AppShell.tsx`, `src/components/BusinessContext.tsx`: aktif marka seçici, marka listesi ve paylaşılan bağlam.
- `src/lib/business-store.ts`, `src/components/ProfileForm.tsx`: seçili markayı yükleme, yeni marka oluşturma ve sosyal hesap kimliklerini koruma.
- `src/components/Generator.tsx`, `src/components/VisualCreator.tsx`, `src/components/MediaPicker.tsx`, `src/components/Calendar.tsx`, `src/components/Library.tsx`: aktif `business_id` ile tüm sorgu/insert akışları.
- `src/app/api/generate/route.ts`, `src/app/api/image/route.ts`, `src/app/api/media/**`, `src/lib/api-user.ts`: istemciden gelen işletme kimliğini doğrulama; kota rezervasyonunu üretimden önce alma ve başarısız çağrıda bırakma.
- `schema_v5_workspace_and_manual_publishing.sql`: sosyal hesapları atomik senkronize eden RPC; içerik takviminde hedef hesap, manuel yayın zamanı/linki; atomik üretim kotası ve gerekli RLS/index/trigger. Mevcut `schema_v2_image_usage.sql` policy tekrar çalıştırılabilir hale getirilir.
- `src/lib/calendar-utils.ts`, `src/components/Calendar.tsx`: hedef hesap ve yayın bilgisi tip/UI akışı.
- `src/components/Library.tsx`, `src/components/ProfileForm.tsx`, `src/components/VisualCreator.tsx`, `src/app/globals.css`: güncel taslaktan kopyalama, canvas alt açıklaması, görünür odak ve kontrast.
- `src/lib/*.test.ts`, `vitest.config.mts`, `package.json`, `.nvmrc`, `README.md`: test/kurulum ve CI doğrulama zemini.

## Uygulama ilkeleri

- RLS korunur; sunucu anahtarları istemciye taşınmaz, sahiplik hem UI sorgusunda hem API'de doğrulanır.
- İşletme seçimi değiştiğinde eski markanın verileri ekranda kalmaz; tüm modüller yeni bağlamla tekrar yüklenir.
- Eski takvim planları ve yeni alanları olmayan veritabanları migration sonrasında geriye uyumlu çalışır.
- Hata mesajları kullanıcıya anlaşılır, loglar anahtar/kişisel içerik sızdırmayacak biçimde kalır.
