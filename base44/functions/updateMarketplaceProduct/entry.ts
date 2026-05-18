import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, data } = body;

    if (!id || !data) {
      return Response.json({ error: 'id and data are required' }, { status: 400 });
    }

    // Service role ile güncelle (RLS bypass)
    const updated = await base44.asServiceRole.entities.MarketplaceProduct.update(id, data);

    return Response.json({ updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});