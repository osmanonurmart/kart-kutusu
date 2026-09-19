# kart-kutusu

İki kişilik bir flashcard uygulaması. Deste, kişiye özel ve bir kez
karıştırılmış sabit bir sırada dolaşılır; nerede bırakırsan oradan devam eder.
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
| `stats` | Kişi başı toplam tekrar ve deste sıraları (`rotations`). Doküman id'si = kullanıcı adı |

Arayüzde değişiklik yapmak veriye dokunmaz. Ancak şunları değiştirmek
mevcut kayıtları sahipsiz bırakır ve ayrıca bir taşıma gerektirir:

- `firebaseConfig` — başka projeye bağlar
- `USERS` dizisindeki isimler — `progress` ve `stats` id'leri isme bağlı
- Koleksiyon adları veya `progressKey()` şeması
- Alan adları: `front`, `back`, `deckId`, `visibility`, `streak`, `retired`
  (eski kayıtlardaki `box` alanı yalnızca `streak` yoksa okunur; artık yazılmaz)

## Kart metni

Kart yüzleri sola dayalı yazılır ve alt satırlar korunur. Metin düz metin
olarak saklanır; liste yalnızca ekranda çizilir:

- `- ` veya `* ` ile başlayan satırlar madde listesi olur
- `1. ` / `2. ` ile başlayanlar numaralı liste olur

Kart formundaki **• Madde** ve **1. Numara** butonları seçili satırları
listeye çevirir (aynı butona basmak geri alır). Bir madde satırında Enter'a
basınca sıradaki madde otomatik açılır, boş maddede Enter listeden çıkar.

Çalışma ekranındaki kart, ekranda kalan alan kadar uzar (en çok 460px) ve
metin sığmıyorsa yazı boyutu 21px'ten 12px'e kadar otomatik küçültülür.
12px'te bile taşan kartlarda metin kaydırılabilir kalır ve alt kenarda
soluklaşma gösterilir.

## Dışa / içe aktarma ve seviyeler

İçe aktarmada her satır bir karttır. Ön ve arka yüz şu sırayla aranan ilk
ayırıcıdan bölünür: **Tab** (Excel'den iki sütun) → **`¦`** → ` - ` → `-`.

```
elma ¦ apple
e-posta ¦ email
başkent ¦ Ankara
- 1923'ten beri
```

`¦` (kesik dikey çizgi) kartları Claude'a yazdırmak için seçildi: klavyede
yazılması gerekmiyor, önemli olan metinde hiç geçmemesi. Tire, `e-posta` gibi
kelimelerde satırı yanlış yerden bölüyordu. Normal `|` kullanılmıyor, çünkü
Claude onu görünce Markdown tablosuna çevirebiliyor.

İçe aktarma penceresindeki **📋 Claude için talimat** düğmesi biçim tarifini
panoya kopyalar; Claude'a yapıştırıp konuyu yazman yeterli. Claude'un kod
bloğu satırları (```` ``` ````) otomatik atlanır. Ayırıcısı olmayan satırlar
sayaçta kırmızı "N satır anlaşılamadı" olarak görünür.

Dışa aktarma şimdilik ` - ` ile yazar; içe aktarma iki biçimi de okur.

Bir destede **⇩ Dışa aktar** her satırın sonuna iki kullanıcının kutu
seviyesini de yazar:

```
elma - apple - 1.2 - 2.4
armut - pear - 1.5 - 2.1
```

`1.2` = 1. kullanıcı (`USERS[0]`) 2. kutuda, `2.4` = 2. kullanıcı 4. kutuda.

Kart metninde alt satır varsa dışa aktarmada tek satıra `\n` olarak
yazılır; içe aktarırken tekrar alt satıra dönüşür.

Bu metinle uygulama dışında (ör. başka bir yapay zeka ile) çalıştıktan sonra
**bildiğin kartların seviyesinin sonuna `+` koy** ve geri içe aktar:

```
elma - apple - 1.2+ - 2.4
```

İçe aktarmada `+` işaretli her kullanıcının `streak` sayacı bir artar, yani
kart bir seviye yukarı çıkar.

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

## Deste sırası

Takvim yok. Her kullanıcı için her destenin bir kez karıştırılmış **sabit
sırası** ve bu sırada nerede kalındığını gösteren bir imleç tutulur; ikisi de
`stats/<kullanıcı>` belgesinin `rotations` alanında durur, yani telefonla
bilgisayar arasında da taşınır. Bir gün 100 kart, ertesi gün 20 kart
çalışabilirsin — kaldığın yerden devam eder. Sıranın sonuna gelinince kartlar
yeniden karışır ve tur baştan başlar.

- Bilinemeyen kart sıranın **sonuna** taşınır, aynı turda bir kez daha gelir.
- Tur ortasında eklenen kart, sıranın kalan kısmına rastgele serpiştirilir.
- Deste ekranındaki `75/100` sayacı: sırada kalan kart / toplam kart.

## Birlikte çalışma

Deste ekranındaki **👥 Birlikte / 🙋 Tek başıma** seçicisi cevap düğmelerini
belirler. Birlikte modda dört düğme çıkar ve tek cevap iki kişinin kaydını
birden günceller:

| Düğme | `USERS[0]` | `USERS[1]` |
|---|---|---|
| `<USERS[0]> bildi` | doğru | yanlış |
| `<USERS[1]> bildi` | yanlış | doğru |
| `İkimiz bildik` | doğru | doğru |
| `İkimiz de bilemedik` | yanlış | yanlış |

Düğmelerin yeri `USERS` sırasına sabittir; ekranda kim seçili olursa olsun
değişmez. Kart yalnız bir kişiye görünüyorsa (`visibility`) otomatik olarak
iki düğmeye (`Bilmedim` / `Bildim`) düşülür.

Cevap veren ekranda seçili olmayan kullanıcı için şu kurallar geçerli:

- Kart onun sırasında henüz gelmediyse **doğru bildiğinde** imlecin gerisine
  alınır — "sanki o da çalıştı" sayılır, `kalan` bir azalır.
- **Bilemediğinde** kart sırasında olduğu yerde kalır.
- Kartı ustalaşılanlara ayırmışsa kaydına hiç dokunulmaz.

Tek başına modda yalnızca ekranda seçili kişinin kaydı değişir. Bu seçenek
şunun için var: tek başına çalışırken "`USERS[0]` bildi" demek aynı zamanda
"`USERS[1]` bilemedi" demek olurdu ve karşı taraf haksız yere geriye düşerdi.

## Günlük sayaç

Ana ekranda her kullanıcı için o günün doğru / yanlış / toplam sayısı görünür.
`stats/<kullanıcı>` belgesinde `todayDate`, `todayCorrect`, `todayWrong`
alanlarında durur; kayıtlı tarih bugün değilse değerler sıfır sayılır, gece
yarısı ayrı bir sıfırlama yazması gerekmez. Sayaçlar seans boyunca bellekte
birikip çalışmadan çıkarken (ve sekme kapanırken) yazılır.

## Ustalaşma

`progress` kaydındaki `streak` alanı arka arkaya kaç kez doğru bilindiğini
tutar; yanlış cevap sıfırlar. `MASTER_STREAK` (5) tamamlandığında kart
"ustalaşıldı" sayılır. Deste ekranındaki öğrenme eğrisinin altındaki düğme,
ustalaşılan kartları o kullanıcı için ayırır: kart taşınmaz, yalnızca
`retired` işareti konur — böylece diğer kullanıcının destesi etkilenmez.
Ayrılan kartlar ana ekranda `<deste> · Ustalaşılanlar` olarak görünür ve
`↩` ile geri alınabilir.

1–5 kutu ölçeği yalnızca görsel bir göstergedir ve `streak`'ten türetilir:
0→1, 1→2, 2→3, 3–4→4, 5→5.

## Bildirimler ve onay pencereleri

Tarayıcının hazır `alert` / `confirm` pencereleri kullanılmaz; yerine
uygulamanın kendi tasarımı var (`toast()` ve `confirmDialog()`).

- **Bildirim:** ✓ yeşil (başarı), ✕ kırmızı (hata), ℹ mavi (bilgi). Alttan
  kayarak çıkar, ~3,5 sn sonra (hatalar 6 sn) kaybolur, dokununca kapanır.
  Açık bir pencere varken düğmeleri kapatmasın diye üstten iner. En çok 3
  tanesi üst üste görünür.
- **Onay penceresi:** Vazgeç + renkli eylem düğmesi (silme kırmızı, ayırma
  yeşil, geri yükleme sarı). Silmelerde odak Vazgeç'te başlar; Esc ya da
  perdeye dokunmak vazgeçer. Açıkken çalışma ekranı kısayolları çalışmaz.

## Klavye kısayolları (çalışma ekranı)

| Tuş | İşlev |
|---|---|
| `Boşluk` / `Enter` | Kartı çevir |
| `1` `2` `3` `4` | Birlikte modda: `USERS[0]` bildi · `USERS[1]` bildi · ikimiz · hiçbirimiz |
| `1` `2` | Tek başına modda: bilmedim · bildim |
| `←` | Önceki soru |
| `S` | Sesli oku |
| `Z` | Geri al |
| `Esc` | Çalışmadan çık |

## Cevap akışı

Cevap verilince kart beklemeden geçer: Firestore yazmaları arkada yapılır
(yerel kopya anında güncellenir, çevrimdışıysa yazma kuyruğa girer). Kartın
kenarı parlar (biri bile bildiyse yeşil, kimse bilemediyse kırmızı) ve kart
bilen kişinin düğmesinin tarafına uçar:

| Düğme | Yön |
|---|---|
| `<USERS[0]> bildi` | sola |
| `<USERS[1]> bildi` | sağa |
| `İkimiz bildik` | yukarı |
| `İkimiz de bilemedik` | aşağı düşer |
| `Bildim` / `Bilmedim` (tek başına) | sağa / sola | Animasyon sürerken gelen
yeniden çizimler ertelenir, ikinci dokunuş ve kısayollar yok sayılır.
Sistemde "hareketi azalt" açıksa yalnızca kısa bir solma olur.

Çalışma ekranının üstündeki `✓ / ✕` sayacı bu seansta ekrandaki kişinin
doğru / yanlış sayısıdır. Yöne değil kişinin kendi sonucuna bakar:
`<USERS[1]> bildi` denince kart yeşil parlar ama ekranda `USERS[0]`
seçiliyse onun `✕` sayısı artar.

Çalışmadan çıkarken günlük sayaçlar iki kullanıcı için aynı anda, beklemeden
yazılır; özet ekranı hemen açılır.

**Kaydırarak cevap:** İki düğmeli modda (tek başına ya da tek kişiye özel
kart) çevrilmiş kartı sağa sürüklemek *Bildim*, sola sürüklemek *Bilmedim*
demektir. Eşik 90px; altında bırakılırsa kart yerine döner. Birlikte modda
dört seçenek iki yöne sığmadığı için kapalıdır.
