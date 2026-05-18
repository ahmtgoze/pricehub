import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { data, event, payload_too_large } = body;

    if (event?.type !== 'create') {
      return Response.json({ message: 'Skipped' });
    }

    // Kategoriyi al
    let category = data;
    if (!category || payload_too_large) {
      const categories = await base44.asServiceRole.entities.Category.list();
      category = categories.find(c => c.id === event.entity_id);
    }

    if (!category) {
      return Response.json({ message: 'Category not found', entity_id: event.entity_id }, { status: 404 });
    }

    // Kategoriyi oluşturan kullanıcının e-postasını category.created_by'dan al
    const createdByEmail = category.created_by;
    if (!createdByEmail) {
      return Response.json({ message: 'No created_by on category' });
    }

    // O kullanıcının aktif platformlarını çek
    const platforms = await base44.asServiceRole.entities.Platform.filter({ 
      created_by: createdByEmail,
      is_active: true 
    });

    if (!platforms || platforms.length === 0) {
      return Response.json({ message: 'No active platforms found' });
    }

    // Bu kategori için mevcut komisyonları bul
    const allCommissions = await base44.asServiceRole.entities.Commission.filter({ category_id: category.id });
    const existingPlatformIds = allCommissions.map(c => c.platform_id);

    const toCreate = platforms.filter(p => !existingPlatformIds.includes(p.id));

    await Promise.all(toCreate.map(platform =>
      base44.asServiceRole.entities.Commission.create({
        platform_id: platform.id,
        platform_name: platform.name,
        category_id: category.id,
        category_name: category.name,
        commission_rate: 0,
        commission_vat_rate: 20,
        is_active: true,
      })
    ));

    return Response.json({ created: toCreate.length, category_id: category.id, message: 'Commission records created' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});