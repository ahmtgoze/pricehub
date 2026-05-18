import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // is_manual = true ve is_admin_created != true olan kayıtları güncelle
    const manualRates = await base44.entities.ShippingRate.filter({
      is_manual: true
    });

    const ratesToUpdate = manualRates.filter(r => r.is_admin_created !== true);

    let updated = 0;
    for (const rate of ratesToUpdate) {
      await base44.entities.ShippingRate.update(rate.id, {
        is_admin_created: true
      });
      updated++;
    }

    return Response.json({
      success: true,
      message: `${updated} tarife sistem tarifesi olarak işaretlendi.`,
      updated
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});