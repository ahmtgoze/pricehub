# Genel Ayarlar

**Route:** `/Settings`
**Görünüm:** Tüm kullanıcılara açık. Bazı bölümler yalnızca admin rolüne gösterilir.

## Ne yapar?

Hesap bilgileri, güvenlik, marka kimliği ve kullanıcı yönetimini tek bir panelde toplar. Sol menüdeki 4 sekme arasında geçiş yapılır; her sekme bağımsız bir form içerir.

---

## Sol Menü Sekmeleri

| Sekme | Kime görünür | Ne yapar |
|---|---|---|
| Hesap | Herkes | Ad-soyad ve e-posta güncelleme |
| Güvenlik | Herkes | Şifre değiştirme |
| Marka Ayarları | Yalnızca admin | Uygulama genelindeki marka adını değiştirme |
| Kullanıcılar | Yalnızca admin | Sistemdeki kullanıcıları görme ve rol değiştirme |

---

## Hesap Sekmesi

### Ne yapar?
Oturum açmış kullanıcının profil bilgilerini günceller.

### Alanlar

| Alan | Açıklama |
|---|---|
| Ad | Kullanıcının adı |
| Soyad | Kullanıcının soyadı |
| E-posta | Kayıtlı e-posta adresi (değişiklikte doğrulama gerekebilir) |

### Butonlar

| Buton | Ne yapar |
|---|---|
| Kaydet | Profil bilgilerini günceller; başarıda yeşil toast gösterilir |

---

## Güvenlik Sekmesi

### Ne yapar?
Şifre değişikliği yapar.

### Alanlar

| Alan | Açıklama |
|---|---|
| Mevcut Şifre | Kimlik doğrulama için gerekli |
| Yeni Şifre | En az 8 karakter |
| Yeni Şifre (Tekrar) | Yeni şifreyi doğrulamak için tekrar giriş |

### Butonlar

| Buton | Ne yapar |
|---|---|
| Şifreyi Değiştir | Supabase Auth üzerinden şifre günceller; başarıda toast gösterilir |

### Dikkat
- Mevcut şifre yanlışsa işlem reddedilir ve hata mesajı gösterilir.
- Yeni şifreler uyuşmuyorsa form gönderilmez.

---

## Marka Ayarları Sekmesi (Yalnızca Admin)

### Ne yapar?
`app_config` tablosundaki `marka_adi` değerini günceller. Bu değer uygulamanın sol üst köşesinde, giriş sayfasında ve tarayıcı sekmesinde görünen marka adıdır.

### Alanlar

| Alan | Açıklama |
|---|---|
| Marka Adı | Uygulama genelinde kullanılacak isim (varsayılan: PriceHub) |

### Butonlar

| Buton | Ne yapar |
|---|---|
| Kaydet | `app_config` tablosunu günceller; sayfa başlığı anında değişir |

### Teknik Not
- `app_config` tablosu singleton pattern ile çalışır: tek satır, `id = 'singleton'`
- RLS: herkes okuyabilir (SELECT), yalnızca admin yazabilir (UPDATE)
- Admin olmayan kullanıcılar bu sekmeyi hiç görmez

---

## Kullanıcılar Sekmesi (Yalnızca Admin)

### Ne yapar?
Sistemde kayıtlı tüm kullanıcıları listeler ve rollerini yönetir.

### Tablo Sütunları

| Sütun | Açıklama |
|---|---|
| Ad Soyad | Kullanıcının tam adı |
| E-posta | Kayıtlı e-posta |
| Rol | `admin` veya `user` |
| Katılım Tarihi | Hesap oluşturulma tarihi |
| İşlemler | Rol değiştirme butonu |

### Butonlar

| Buton | Ne yapar |
|---|---|
| Admin Yap | Seçili kullanıcının rolünü `admin` olarak günceller |
| Kullanıcı Yap | Seçili kullanıcının rolünü `user` olarak düşürür |

### Dikkat
- Kendinizin rolünü değiştiremezsiniz (kendi satırındaki buton pasif gelir).
- Rol değişikliği anında `user_profiles` tablosuna yansır; kullanıcı bir sonraki sayfayı yenilediğinde yeni rol yetkisiyle çalışır.
- Admin olmayan kullanıcılar bu sekmeyi hiç görmez.

---

## Veri Kaynakları

| Bölüm | Tablo |
|---|---|
| Hesap | `user_profiles` (auth.uid() ile eşleşen satır) |
| Güvenlik | Supabase Auth API |
| Marka Ayarları | `app_config` (singleton, id = 'singleton') |
| Kullanıcılar | `user_profiles` (tüm satırlar) |
