import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date().toISOString();

    // Get all read records where auto_delete_at has passed
    const allReads = await base44.asServiceRole.entities.AnnouncementRead.list('-created_date', 1000);
    const toDelete = allReads.filter(r =>
      r.auto_delete_at && r.auto_delete_at < now
    );

    if (toDelete.length === 0) {
      return Response.json({ deleted: 0 });
    }

    await Promise.all(
      toDelete.map(r => base44.asServiceRole.entities.AnnouncementRead.delete(r.id))
    );

    return Response.json({ deleted: toDelete.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});