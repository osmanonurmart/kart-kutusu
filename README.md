# kart-kutusu

İki kişilik, Leitner kutusu mantığıyla çalışan bir flashcard uygulaması.
Tamamı tek bir `index.html` dosyası; veriler Firebase Firestore'da tutulur.

## Çalıştırma

`index.html`'i tarayıcıda aç. Kurulum, derleme adımı veya bağımlılık yok.

## Veriler nerede

Kod dosyasında **hiç veri yok**. Her şey Firestore'da, dört koleksiyonda durur:

| Koleksiyon | İçerik |
|---|---|
| `decks` | Deste adları |
| `cards` | Kartlar (`deckId`, `front`, `back`, `visibility`, `image`) |
| `progress` | Kişi başı ilerleme. Doküman id'si `<kullanıcı>__<cardId>` |
| `stats` | Kişi başı seri ve toplam tekrar. Doküman id'si = kullanıcı adı |

Arayüzde değişiklik yapmak veriye dokunmaz. Ancak şunları değiştirmek
mevcut kayıtları sahipsiz bırakır ve ayrıca bir taşıma gerektirir:

- `firebaseConfig` — başka projeye bağlar
- `USERS` dizisindeki isimler — `progress` ve `stats` id'leri isme bağlı
- Koleksiyon adları veya `progressKey()` şeması
- Alan adları: `front`, `back`, `deckId`, `visibility`, `box`, `nextReview`

## Dışa / içe aktarma ve seviyeler

Bir destede **⇩ Dışa aktar** her satırın sonuna iki kullanıcının kutu
seviyesini de yazar:

```
elma - apple - 1.2 - 2.4
armut - pear - 1.5 - 2.1
```

`1.2` = 1. kullanıcı (`USERS[0]`) 2. kutuda, `2.4` = 2. kullanıcı 4. kutuda.

Bu metinle uygulama dışında (ör. başka bir yapay zeka ile) çalıştıktan sonra
**bildiğin kartların seviyesinin sonuna `+` koy** ve geri içe aktar:

```
elma - apple - 1.2+ - 2.4
```

İçe aktarmada `+` işaretli her kullanıcının kutusu bir üste çıkar, tekrar
tarihi yeni kutuya göre ileri alınır.

**Önemli:** `+` konmayan sayılar yalnızca bilgi amaçlıdır, içe aktarmada
**dikkate alınmaz**. Sayıyı elle değiştirmenin bir etkisi olmaz — ilerlemeyi
değiştiren tek şey `+` işaretidir. Bu sayede yanlışlıkla seviye sıfırlamak
mümkün değildir.

Seviye alanı olmayan eski biçimdeki metinler (`elma - apple`) eskisi gibi
çalışmaya devam eder.

## Yedekleme

Ana ekrandaki **💾 Yedek** butonu tüm Firestore verisini tek bir JSON
dosyasına indirir ve aynı dosyadan geri yükler. Geri yükleme yıkıcı
değildir: aynı id'li kayıtların üzerine yazılır, yedekte olmayan hiçbir
kayıt silinmez. Geri yüklemeden önce mevcut halin yedeği otomatik iner.

## Sesli pratik (Claude)

Bir destede **🎙 Claude ile sesli pratik**: mikrofona konuşursun, Claude
destedeki kelimeler üzerinden sohbet eder ve cevabı yüksek sesle okunur.

Bu özellik `worker/` altındaki küçük bir Cloudflare Worker'a ihtiyaç duyar —
Anthropic API anahtarı tarayıcıya konamaz, çünkü `index.html` herkese açık.
Kurulum adımları **`worker/README.md`** dosyasında. Kurulmadan uygulamanın
geri kalanı normal çalışır; yalnızca bu buton kurulum penceresi açar.

Ses tanıma Chrome, Edge ve Safari'de çalışır; Firefox'ta çalışmaz.

## Firestore kuralları

Güvenlik kuralları `firestore.rules` dosyasında. Firebase konsolunda
Firestore Database → Rules altına yapıştırılması gerekir; dosyanın başındaki
açıklama nasıl yapılacağını ve kuralın ne anlama geldiğini anlatır.

## Renk paleti

Koyu (dark-first) tema. Tüm renkler `index.html` içindeki `:root` bloğunda
CSS değişkeni olarak tanımlı; stil kurallarında sabit renk yazılmaz.

| Değişken | Kullanım |
|---|---|
| `--bg` | Sayfa zemini |
| `--panel` | Kart/panel yüzeyi |
| `--panel-acik` | Üçüncü katman (çalışma kartının ön yüzü, modal içi) |
| `--line` | Ayraç ve kenarlıklar |
| `--metin` / `--sonuk` | Ana metin / ikincil metin |
| `--mavi` | Birincil vurgu ve aksiyon |
| `--yesil` `--kirmizi` `--sari` | Başarı / hata / uyarı |
| `--kutu1`…`--kutu5` | Öğrenme kutusu ölçeği, paletten türetilir |
| `--r` / `--r-kucuk` | Köşe yuvarlaklığı (16px / 8px) |

Derinlik gölgeyle değil, yüzey tonu farkı (`--bg` < `--panel` < `--panel-acik`)
ve ince `--line` kenarlıklarla verilir. Vurgu renkleri geniş alan boyamak için
değil, durum bildirimi ve seçili öğe için kullanılır; yumuşak gerektiğinde
rengin %12 opaklıklı hâli zemin, tam hâli kenarlık ve metin olur
(`--mavi-yumusak` vb.).

Tek istisna: sarı dolu zemin üzerine beyaz metin ~2:1 kontrast verdiği için
okunmuyordu. Sarı butonlar bunun yerine paletin kendi öngördüğü yumuşak
zemin + tam renk kenarlık/metin biçimini kullanıyor.

## Tekrar aralıkları

Kutu 1 → aynı gün, 2 → 1 gün, 3 → 3 gün, 4 → 7 gün, 5 → 21 gün
(`BOX_INTERVAL_DAYS`). Yanlış cevap kartı en fazla 2. kutuya indirir,
asla yükseltmez.

## Klavye kısayolları (çalışma ekranı)

| Tuş | İşlev |
|---|---|
| `Boşluk` / `Enter` | Kartı çevir · çoktan seçmelide devam et |
| `1` `2` `3` | Bilmedim · Bildim · Kesin öğrendim |
| `1`–`4` | Çoktan seçmelide şık seç |
| `←` | Önceki soru |
| `S` | Sesli oku |
| `Z` | Geri al |
| `Esc` | Çalışmadan çık |
