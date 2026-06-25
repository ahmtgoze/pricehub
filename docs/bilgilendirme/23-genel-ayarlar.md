# Genel Ayarlar

**Route:** `/Settings`

## Ne yapar?

Hesap bilgileri, güvenlik ve uygulama geneli ayarları yönetir. Bazı bölümler yalnızca yöneticilere (admin) görünür.

## Bölümler

### Hesap (tüm kullanıcılar)
- Ad soyad güncelleme
- E-posta görüntüleme (değiştirilemez)
- Rol görüntüleme (Kullanıcı / Yönetici)

### Güvenlik (tüm kullanıcılar)
- Mevcut şifre doğrulayarak yeni şifre belirleme
- Şifreyi göster/gizle özelliği

### Marka Ayarları (sadece admin)
- Uygulamanın adını değiştirmek (sidebar ve giriş ekranında görünür)
- Değişiklik tüm kullanıcılara sayfa yenilendiğinde yansır

### Kullanıcılar (sadece admin)
- Tüm kayıtlı kullanıcıları listeleme
- Kullanıcı rolü değiştirme (Kullanıcı / Yönetici)
- Kullanıcıyı aktif veya pasif yapma (pasif kullanıcı sisteme giremez)

## Dikkat edilecekler

- E-posta adresi Supabase kimlik doğrulamasıyla bağlıdır; bu sayfadan değiştirilemez.
- Kullanıcıyı pasif yapmak oturumunu hemen kapatmaz; bir sonraki girişinde engellenirler.
- Kendi hesabınızı pasif yapmaktan kaçının.
