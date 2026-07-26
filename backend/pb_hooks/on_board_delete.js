// Cascade delete: when a board is deleted, delete its lists and their tasks.
//
// NOTE: Same Solarch hook bugs apply here — onRecordDelete tag is discarded
// and the hook never actually fires. This file is kept for documentation.
// Cascade deletion is handled client-side in the frontend.
//
// See docs/PACKAGE-ISSUES.md for full bug reports.

onRecordDelete('boards', (e) => {
  const boardId = e.record.get('id');
  console.log(`[hook] WOULD cascade-delete lists/tasks for board ${boardId}`);
  console.log('[hook] But this hook never fires due to Solarch bugs — see PACKAGE-ISSUES.md');
});
