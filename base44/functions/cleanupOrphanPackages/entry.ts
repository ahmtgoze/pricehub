import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Kullanıcının tüm paketlerini, paket kalemlerini ve ürünlerini çek
    const [allPackages, allPackageItems, allProducts] = await Promise.all([
      base44.entities.Package.filter({ created_by: user.email }),
      base44.entities.PackageItem.filter({ created_by: user.email }),
      base44.entities.Product.filter({ created_by: user.email }),
    ]);

    // Var olan geçerli paket ID'leri
    const validPackageIds = new Set(allPackages.map(p => p.id));

    // Aktif kalemi olan paket ID'leri
    const packageIdsWithActiveItems = new Set(
      allPackageItems
        .filter(item => item.is_active !== false)
        .map(item => item.package_id)
    );

    const updates = [];

    for (const product of allProducts) {
      const updateData = {};

      // Tek paketli: package_id geçersizse temizle
      if (product.package_id && !validPackageIds.has(product.package_id)) {
        updateData.package_id = null;
      }
      if (product.auto_package_id && !validPackageIds.has(product.auto_package_id)) {
        updateData.auto_package_id = null;
      }

      // Tek paketli: paket var ama aktif kalemi yoksa temizle
      if (product.package_id && validPackageIds.has(product.package_id) && !packageIdsWithActiveItems.has(product.package_id)) {
        updateData.package_id = null;
      }
      if (product.auto_package_id && validPackageIds.has(product.auto_package_id) && !packageIdsWithActiveItems.has(product.auto_package_id)) {
        updateData.auto_package_id = null;
      }

      // Çok paketli: packages JSON içindeki geçersiz referansları temizle
      if (product.multi_package && product.packages) {
        try {
          const pkgList = typeof product.packages === 'string'
            ? JSON.parse(product.packages)
            : product.packages;

          const cleaned = pkgList.map(pkg => {
            if (!pkg.package_id) return pkg;
            // Paket yoksa veya aktif kalemi yoksa referansı temizle
            if (!validPackageIds.has(pkg.package_id) || !packageIdsWithActiveItems.has(pkg.package_id)) {
              return { ...pkg, package_id: null };
            }
            return pkg;
          });

          if (JSON.stringify(cleaned) !== JSON.stringify(pkgList)) {
            updateData.packages = JSON.stringify(cleaned);
          }
        } catch (e) {
          // parse hatası, geç
        }
      }

      if (Object.keys(updateData).length > 0) {
        updates.push(
          base44.entities.Product.update(product.id, updateData)
        );
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    console.log(`Temizlendi: ${updates.length} ürün güncellendi`);
    return Response.json({ cleaned: updates.length, total_products: allProducts.length });
  } catch (error) {
    console.error('Hata:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});