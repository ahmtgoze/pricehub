import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { data, old_data } = payload;
    const deletedPackageId = data?.id || old_data?.id;

    if (!deletedPackageId) {
      return Response.json({ message: 'package id bulunamadı' });
    }

    // Tüm ürünleri çek (multi_package olanlar için packages JSON'u taramak gerek)
    const allProducts = await base44.asServiceRole.entities.Product.filter({});

    const updates = [];

    for (const product of allProducts) {
      const updateData = {};

      // Tek paketli: package_id veya auto_package_id temizle
      if (product.package_id === deletedPackageId) {
        updateData.package_id = null;
      }
      if (product.auto_package_id === deletedPackageId) {
        updateData.auto_package_id = null;
      }

      // Çok paketli: packages JSON içindeki referansları temizle
      if (product.multi_package && product.packages) {
        try {
          const pkgList = typeof product.packages === 'string'
            ? JSON.parse(product.packages)
            : product.packages;

          const cleaned = pkgList.map(pkg =>
            pkg.package_id === deletedPackageId
              ? { ...pkg, package_id: null }
              : pkg
          );

          // Değişim olduysa kaydet
          if (JSON.stringify(cleaned) !== JSON.stringify(pkgList)) {
            updateData.packages = JSON.stringify(cleaned);
          }
        } catch (e) {
          // parse hatası, geç
        }
      }

      if (Object.keys(updateData).length > 0) {
        updates.push(
          base44.asServiceRole.entities.Product.update(product.id, updateData)
        );
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`${updates.length} ürünün paket ataması temizlendi (silinmiş package_id: ${deletedPackageId})`);
    }

    return Response.json({ cleaned: updates.length, package_id: deletedPackageId });
  } catch (error) {
    console.error('Hata:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});