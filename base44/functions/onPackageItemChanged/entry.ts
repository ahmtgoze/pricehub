import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;

    // Silinen veya deaktive edilen PackageItem'ın package_id'sini bul
    const affectedPackageId = data?.package_id || old_data?.package_id;

    if (!affectedPackageId) {
      return Response.json({ message: 'package_id bulunamadı, işlem atlandı' });
    }

    // O pakete ait hala aktif item var mı kontrol et
    const remainingItems = await base44.asServiceRole.entities.PackageItem.filter({
      package_id: affectedPackageId,
      is_active: true,
    });

    // Eğer pakete ait hiç aktif item yoksa, bu paketi kullanan ürünleri temizle
    const packageCost = remainingItems.reduce((sum, item) => sum + (item.cost || 0), 0);

    if (packageCost === 0) {
      // package_id veya auto_package_id eşleşen ürünleri bul
      const [productsByPackageId, productsByAutoPackageId] = await Promise.all([
        base44.asServiceRole.entities.Product.filter({ package_id: affectedPackageId }),
        base44.asServiceRole.entities.Product.filter({ auto_package_id: affectedPackageId }),
      ]);

      // Tüm etkilenen ürünleri birleştir (tekrar etmeyecek şekilde)
      const allProductIds = new Set();
      const updates = [];

      for (const product of productsByPackageId) {
        if (!allProductIds.has(product.id)) {
          allProductIds.add(product.id);
          updates.push(
            base44.asServiceRole.entities.Product.update(product.id, { package_id: null })
          );
        }
      }

      for (const product of productsByAutoPackageId) {
        if (!allProductIds.has(product.id)) {
          allProductIds.add(product.id);
          updates.push(
            base44.asServiceRole.entities.Product.update(product.id, { auto_package_id: null })
          );
        }
      }

      if (updates.length > 0) {
        await Promise.all(updates);
        console.log(`${updates.length} ürünün paket ataması temizlendi (package_id: ${affectedPackageId})`);
      }

      return Response.json({ cleaned: updates.length, package_id: affectedPackageId });
    }

    return Response.json({ message: 'Pakette hala aktif item var, temizleme yapılmadı', remaining: remainingItems.length });
  } catch (error) {
    console.error('Hata:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});