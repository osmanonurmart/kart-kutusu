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

## Yedekleme

Ana ekrandaki **💾 Yedek** butonu tüm Firestore verisini tek bir JSON
dosyasına indirir ve aynı dosyadan geri yükler. Geri yükleme yıkıcı
değildir: aynı id'li kayıtların üzerine yazılır, yedekte olmayan hiçbir
kayıt silinmez. Geri yüklemeden önce mevcut halin yedeği otomatik iner.

## Firestore kuralları

Güvenlik kuralları `firestore.rules` dosyasında. Firebase konsolunda
Firestore Database → Rules altına yapıştırılması gerekir; dosyanın başındaki
açıklama nasıl yapılacağını ve kuralın ne anlama geldiğini anlatır.

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
