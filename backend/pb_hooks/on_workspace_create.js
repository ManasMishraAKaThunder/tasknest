onRecordCreate('workspaces', (e) => {
  const workspaceId = e.record.get('id');
  const ownerId = e.record.get('owner');

  if (!ownerId) {
    console.log('[hook] workspace created without an owner, skipping auto-membership');
    return;
  }

  const membersCollection = $app.findCollectionByNameOrId('workspace_members');
  const memberRecord = $app.newRecord(membersCollection);
  memberRecord.set('workspace', workspaceId);
  memberRecord.set('user', ownerId);
  memberRecord.set('role', 'owner');
  $app.save(memberRecord);

  console.log(`[hook] auto-added ${ownerId} as owner member of workspace ${workspaceId}`);
});