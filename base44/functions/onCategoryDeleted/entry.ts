import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data: category } = body;

    if (event?.type !== 'delete') {
      return Response.json({ message: 'Skipped' });
    }

    const categoryId = event.entity_id;

    // O kategoriye ait tüm komisyonları sil
    const commissions = await base44.asServiceRole.entities.Commission.filter({ category_id: categoryId });
    
    if (commissions.length > 0) {
      await Promise.all(commissions.map(c =>
        base44.asServiceRole.entities.Commission.delete(c.id)
      ));
    }

    // O kategoriye ait ürünleri kontrol et
    const products = await base44.asServiceRole.entities.Product.filter({ category_id: categoryId });

    return Response.json({ 
      deleted_commissions: commissions.length, 
      affected_products: products.length,
      category_name: category?.name,
      message: 'Commission records deleted' 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});