// Workaround for Solarch hook system bugs:
// 1. onRecordCreate tag parameter is silently discarded (JSVM ignores it)
// 2. onRecordCreate is never actually triggered in the save() flow
// 3. $app.newRecord() doesn't exist in the JSVM sandbox
//
// Since the JSVM hook system is fundamentally broken for record-level hooks,
// this file serves as DOCUMENTATION of what the hook SHOULD do.
// The actual auto-membership logic is handled client-side: after creating a
// workspace, the client immediately creates a workspace_members record.
//
// See docs/PACKAGE-ISSUES.md for full bug reports.

// This hook WOULD auto-add the workspace creator as an 'owner' member,
// but due to the bugs above, it never fires. Keeping for reference.
onRecordCreate('workspaces', (e) => {
  const workspaceId = e.record.get('id');
  const ownerId = e.record.get('owner');

  if (!ownerId) {
    console.log('[hook] workspace created without an owner, skipping auto-membership');
    return;
  }

  console.log(`[hook] WOULD auto-add ${ownerId} as owner member of workspace ${workspaceId}`);
  console.log('[hook] But this hook never fires due to Solarch bugs — see PACKAGE-ISSUES.md');
});