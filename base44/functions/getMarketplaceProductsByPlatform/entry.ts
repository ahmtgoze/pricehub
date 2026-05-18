import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { platform_account } = body;

    if (!platform_account) {
      return Response.json({ error: 'platform_account required' }, { status: 400 });
    }

    // Service role ile sadece bu kullanıcının ürünlerini çek (RLS bypass ama kullanıcı bazlı)
    const allProducts = await base44.asServiceRole.entities.MarketplaceProduct.filter(
      { created_by: user.email, platform_account: platform_account },
      '-created_date',
      10000
    );

    const products = allProducts;

    return Response.json({ products, total: allProducts.length, matchedCount: products.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});