# 2. UML modelleri

Diyagramlar Mermaid ile yazıldı (GitHub'da doğrudan görünür). Kod değiştikçe bu dosya güncellenir: **bir akış/tablo değişen PR, ilgili diyagramı da değiştirir.**

> Ayrıntılı içerik hazırlama ve manuel yayın akışı (PlantUML): [`content-lifecycle.puml`](content-lifecycle.puml). Birlikte yapısının adımları: **Yaz → Düzenle → Görsel → Planla**.

## 2.1 Kullanım durumu diyagramı (Use Case)

Mermaid'de yerleşik use-case türü olmadığından aktörler yuvarlak, kullanım durumları oval kutu olarak çizilir.

```mermaid
flowchart LR
  U([Kullanıcı<br/>işletme sahibi / üretici])
  AI([Yapay zekâ servisi<br/>Gemini · DeepSeek · OpenAI])
  PX([Pixabay])
  SM([Sosyal platform<br/>kullanıcı elle paylaşır])

  subgraph SYS[Aı Asisst]
    UC1((Hesap ve marka yönet))
    UC2((Haftayı planla))
    UC3((Metin üret))
    UC4((Kendi metnini yaz))
    UC5((İçeriği düzenle))
    UC6((Görsel hazırla))
    UC7((Video hazırla))
    UC8((Yoruma yanıt hazırla))
    UC9((Müzik seç))
    UC10((Takvimde planla ve hatırla))
    UC11((Asistana sor))
    UC12((Paylaşıldı olarak işaretle))
  end

  U --- UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8 & UC11 & UC10 & UC12
  UC2 -. include .-> UC10
  UC3 -. extend .-> UC9
  UC6 -. extend .-> UC9
  UC7 -. extend .-> UC9
  UC2 --- AI
  UC3 --- AI
  UC8 --- AI
  UC11 --- AI
  UC7 --- AI
  UC6 --- PX
  UC7 --- PX
  UC12 -. kullanıcı elle .-> SM
```

## 2.2 Alan modeli / veri tabanı (ER)

```mermaid
erDiagram
  USER ||--o{ BUSINESS : sahip
  BUSINESS ||--o{ SOCIAL_ACCOUNT : "herkese açık hesap"
  BUSINESS ||--o{ CONTENT : uretir
  CONTENT ||--o{ CONTENT : "alternatif (parent_id)"
  CONTENT ||--o{ CALENDAR_ITEM : planlanir
  BUSINESS ||--o{ GENERATION_RESERVATION : "saatlik kota"
  BUSINESS ||--o{ MEDIA_CLEANUP_QUEUE : "silinemeyen dosya"
  BUSINESS {
    uuid id PK
    text name
    text industry
    text products
    text target_audience
    text brand_voice
    text[] brand_colors
    enum content_language
  }
  CONTENT {
    uuid id PK
    text prompt
    text post_text
    text caption
    text[] hashtags
    text format
    jsonb package
    text visual_url
    text visual_type
    enum status
    uuid parent_id FK
  }
  CALENDAR_ITEM {
    uuid id PK
    uuid content_id FK
    enum platform
    timestamptz scheduled_at
    timestamptz remind_at
    bool done
    timestamptz posted_at
    text post_url
  }
  SOCIAL_ACCOUNT {
    uuid id PK
    enum platform
    text handle
  }
```

## 2.3 Sınıf/modül diyagramı (saf mantık katmanı)

```mermaid
classDiagram
  class BrandPrompt {
    +buildGenerateMessages()
    +buildIdeasMessages()
    +parseIdeas()
  }
  class PostFormats {
    +parsePostPackage()
    +sanitizePackage()
    +packageToLegacy()
    +recommendFormat()
  }
  class PlanPrompt {
    +buildPlanMessages()
    +parsePlan()
  }
  class ReplyPrompt {
    +buildReplyMessages()
    +parseReplies()
  }
  class AssistantChat {
    +buildAssistantMessages()
    +sanitizeHistory()
    +parseAssistantReply()
  }
  class PlatformPlaybook {
    +analyzePost()
  }
  class LLM {
    +generateJson()
    +getProvider()
  }
  class ApiUser {
    +authenticateRequest()
    +getBusinessById()
  }
  BrandPrompt --> PostFormats
  PlanPrompt --> BrandPrompt
  ReplyPrompt --> BrandPrompt
  AssistantChat --> BrandPrompt
  PostFormats --> PlatformPlaybook : kontrol listesi
  class ApiRoutes {
    /api/generate
    /api/plan
    /api/reply
    /api/assistant
    /api/ideas
    /api/video/generate
  }
  ApiRoutes --> ApiUser
  ApiRoutes --> LLM
  ApiRoutes --> BrandPrompt
```

## 2.4 Dizi diyagramı — "Plandan içerik hazırla"

```mermaid
sequenceDiagram
  actor K as Kullanıcı
  participant W as Hafta sayfası
  participant P as /api/plan
  participant L as LLM zinciri
  participant DB as Supabase (RLS)
  participant G as /api/generate

  K->>W: Planla (5 paylaşım)
  W->>P: POST businessId, perWeek (Bearer)
  P->>DB: marka sahipliği + kota rezervasyonu
  P->>L: plan istemi
  L-->>P: JSON plan
  P-->>W: doğrulanmış plan
  K->>W: Seçilenleri takvime ekle
  W->>DB: contents (taslak) + calendar_items
  K->>W: Hazırla (plan satırı)
  W->>G: POST prompt, platform, format
  G->>DB: kota rezervasyonu → içerik kaydı
  G-->>W: paylaşım paketi
  W->>DB: takvim satırını yeni içeriğe bağla, yer tutucuyu sil
```

## 2.5 Durum diyagramı — içerik yaşam döngüsü

```mermaid
stateDiagram-v2
  [*] --> Fikir : plana eklendi (yazı yok)
  [*] --> Taslak : AI üretti / kullanıcı yazdı
  Fikir --> Taslak : Hazırla
  Taslak --> Taslak : Düzenle
  Taslak --> Onaylandi : Onayla
  Onaylandi --> Taslak : Taslağa al
  Onaylandi --> Planli : Takvime koy
  Planli --> Paylasildi : Kullanıcı elle paylaşıp işaretler
  Taslak --> Arsiv
  Onaylandi --> Arsiv
  Paylasildi --> [*]
  Arsiv --> [*]
```

## 2.6 Etkinlik diyagramı — içerik üretim kararı

```mermaid
flowchart TD
  S([Başla]) --> Q{Ne hazırlanacak?}
  Q -->|Yalnız yazı| T{Kim yazacak?}
  T -->|Yapay zekâ| T1[/api/generate/] --> E
  T -->|Kullanıcı| T2[Kendi metnim] --> E
  Q -->|Yalnız görsel| V[Fotoğraf: üret / yükle / Pixabay] --> V2[Şablon seç] --> V3{Yazı eklensin mi?}
  V3 -->|Evet| V4[Başlık ekle] --> E
  V3 -->|Hayır| E
  Q -->|Yazı + görsel| B[Yaz] --> V
  Q -->|Video| M{Kaynak?}
  M -->|AI: ≥3 görsel + metin| M1[Video servisi] --> E
  M -->|Kendi videom| M2[MP4/WebM yükle] --> E
  E[Düzenle] --> Mu{Müzik?}
  Mu -->|Evet| Mu1[Öneri veya kendi dosya] --> K
  Mu -->|Hayır| K[Kütüphane] --> Pl[Takvim] --> Pa([Kullanıcı elle paylaşır])
```

## 2.7 Dağıtım diyagramı

```mermaid
flowchart LR
  subgraph Cihaz[Kullanıcı cihazı - tarayıcı/telefon]
    UI[Next.js arayüzü]
  end
  subgraph Vercel
    API[API rotaları<br/>doğrulama · kota · LLM çağrısı]
  end
  subgraph Supabase
    AUTH[Auth]
    PG[(Postgres + RLS)]
    ST[(Storage: visuals - özel)]
  end
  LLM[Gemini / DeepSeek / OpenAI]
  PIX[Pixabay API]
  UI -->|oturum| AUTH
  UI -->|RLS'li sorgular| PG
  UI -->|yükleme/imzalı URL| ST
  UI -->|Bearer| API
  API --> PG
  API --> LLM
  API --> PIX
  API --> ST
```
