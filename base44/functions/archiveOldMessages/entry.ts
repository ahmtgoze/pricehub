import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get all non-archived messages older than 24h
    const allMessages = await base44.asServiceRole.entities.Message.list('-created_date', 500);
    const toArchive = allMessages.filter(m =>
      !m.is_archived && m.created_date < cutoff
    );

    if (toArchive.length === 0) {
      return Response.json({ archived: 0 });
    }

    await Promise.all(
      toArchive.map(m =>
        base44.asServiceRole.entities.Message.update(m.id, {
          is_archived: true,
          archived_at: new Date().toISOString(),
        })
      )
    );

    return Response.json({ archived: toArchive.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});