# Sesli pratik sunucusu

Bu klasör, uygulamanın "🎙 Claude ile sesli pratik" özelliğini çalıştıran
küçük bir Cloudflare Worker'ı içerir.

## Neden ayrı bir sunucu gerekiyor

`index.html` herkese açık. Anthropic API anahtarını oraya yazsaydık,
sayfanın kaynağını görüntüleyen herkes anahtarı alıp senin hesabına
istek atabilirdi. Bu Worker anahtarı sunucu tarafında tutar; tarayıcı
yalnızca Worker'a konuşur, anahtarı hiç görmez.

## Ne kadar tutar

Ücretli olan tek şey Anthropic API kullanımı. Cloudflare Workers'ın
ücretsiz katmanı (günde 100.000 istek) bu iş için fazlasıyla yeter.

Maliyeti kontrol altında tutmak için:

- **Anthropic Console → Billing → Limits** altından aylık bir harcama
  sınırı koy. Gerçek koruma budur; sınıra ulaşıldığında istekler durur.
- Worker zaten mesaj uzunluğunu, sohbet geçmişini ve cevap uzunluğunu
  sınırlıyor (`src/index.ts` başındaki sabitler).

## Kurulum

Node.js kurulu olmalı.

### 1. Anthropic API anahtarı al

https://console.anthropic.com → API Keys → Create Key. Anahtarı kopyala.

### 2. Cloudflare'e giriş yap

```bash
cd worker
npm install
npx wrangler login
```

### 3. Adresini ayarla

`wrangler.toml` içindeki `ALLOWED_ORIGINS` satırını uygulamayı açtığın
adrese göre düzenle. GitHub Pages kullanıyorsan:

```toml
ALLOWED_ORIGINS = "https://osmanonurmart.github.io"
```

Birden fazla adres varsa virgülle ayır. (Bu, başka sitelerin senin
Worker'ını tarayıcı üzerinden çağırmasını engeller.)

### 4. Gizli değerleri ver

Bunlar `wrangler.toml`'a **yazılmaz** — o dosya depoda duruyor.

```bash
npx wrangler secret put ANTHROPIC_API_KEY
# 1. adımdaki anahtarı yapıştır

npx wrangler secret put APP_PASSPHRASE
# kendi belirlediğin bir parola yaz — uygulamaya girerken bunu kullanacaksın
```

`APP_PASSPHRASE`, Worker'ını internette bulan birinin senin API
kredini harcamasını engeller. Uygulama bu parolayı yalnızca tarayıcında
saklar, depoya girmez.

### 5. Yayına al

```bash
npx wrangler deploy
```

Çıktıda şuna benzer bir adres görürsün:

```
https://kart-kutusu.<hesabin>.workers.dev
```

### 6. Uygulamaya tanıt

Uygulamada bir deste aç → **🎙 Claude ile sesli pratik** → açılan
pencereye 5. adımdaki adresi ve 4. adımdaki parolayı yaz → Kaydet.

Hepsi bu. Artık mikrofona dokunup konuşabilirsin.

## Yerelde denemek

```bash
cp .dev.vars.example .dev.vars   # değerleri doldur
npx wrangler dev
```

`.dev.vars` `.gitignore`'da; depoya girmez.

## Nasıl çalışıyor

1. Tarayıcı mikrofonu açar, konuşmayı metne çevirir (Web Speech API,
   tarayıcının kendi motoru — ücretsiz).
2. Metin, destedeki kartlarla birlikte Worker'a gider.
3. Worker Claude'u çağırır ve cevabı parça parça tarayıcıya akıtır.
4. Tarayıcı cevabı ekrana yazar ve yüksek sesle okur.

Claude'a destedeki kelimeler sistem isteminde veriliyor, böylece sohbeti
senin gerçekten çalıştığın kelimeler üzerinden kuruyor.

## Tarayıcı desteği

Ses tanıma (konuşmayı metne çevirme) Chrome, Edge ve Safari'de çalışır;
Firefox'ta çalışmaz. Telefonda Android→Chrome, iPhone→Safari kullan.
Uygulama desteklenmeyen tarayıcıda uyarı gösterir.
