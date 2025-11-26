# Manuel Ürün İçe Aktarma Rehberi

PDF'den ürünleri otomatik olarak çıkarmak zor olabilir. Bu durumda manuel olarak ürün ekleme yöntemlerini kullanabilirsiniz.

## Yöntem 1: Admin Paneli Üzerinden

1. Admin paneline giriş yapın (`/admin`)
2. "Ürünler" sekmesine gidin
3. "Yeni Ürün" butonuna tıklayın
4. Her ürün için:
   - Ürün adı
   - Açıklama
   - Kategori: "Klasik"
   - Fiyat (PDF'den)
   - Materyal bilgisi
   - Görsel URL'leri (PDF'den çıkarılan görseller)

## Yöntem 2: Toplu JSON Import

1. PDF'den ürün bilgilerini bir JSON dosyasına çıkarın
2. `scripts/import-json.ts` scriptini kullanarak toplu import yapın

## Yöntem 3: Veritabanına Direkt Ekleme

MongoDB'ye direkt bağlanarak ürünleri ekleyebilirsiniz.

## Görselleri Çıkarma

PDF'den görselleri çıkarmak için:
1. PDF'i bir PDF görüntüleyici ile açın
2. Her ürün görselini manuel olarak kaydedin
3. Görselleri `public/uploads/products/` klasörüne koyun
4. Admin panelinde ürün eklerken görsel URL'lerini girin

## Örnek Ürün JSON Formatı

```json
{
  "name": "Ürün Adı",
  "description": "Ürün açıklaması",
  "category": "klasik",
  "price": 150.00,
  "material": "Porselen",
  "dimensions": {
    "height": 5,
    "width": 6,
    "depth": 5,
    "unit": "cm"
  },
  "images": [
    "/uploads/products/urun-1.jpg"
  ],
  "collectionTags": ["Klasik"],
  "isActive": true
}
```




