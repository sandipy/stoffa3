import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  Download,
  RotateCcw,
  Check,
  Clock,
  History,
  Terminal,
  Copy,
  AlertCircle,
  Database,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import {
  listCmsSnapshots,
  createCmsSnapshot,
  restoreCmsSnapshot,
  syncCollectionsToFirestore,
  type CmsSnapshotRecord,
} from '../../lib/firebase';
import {
  loadCuratedCollections,
  saveCuratedCollections,
  resetCuratedCollections,
  CURATED_COLLECTIONS_DATA,
  type CuratedCollectionItem,
} from '../../data/collectionsData';

interface CloudBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCollectionsRestored?: (newCollections: CuratedCollectionItem[]) => void;
}

export const CloudBackupModal: React.FC<CloudBackupModalProps> = ({
  isOpen,
  onClose,
  onCollectionsRestored,
}) => {
  const [snapshots, setSnapshots] = useState<CmsSnapshotRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newSnapshotNote, setNewSnapshotNote] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedGit, setCopiedGit] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSnapshotsList();
    }
  }, [isOpen]);

  const loadSnapshotsList = async () => {
    setIsLoading(true);
    try {
      const records = await listCmsSnapshots(20);
      setSnapshots(records);
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleManualSnapshot = async () => {
    const current = loadCuratedCollections();
    setIsCreatingSnapshot(true);
    setStatusMessage(null);
    try {
      const note = newSnapshotNote.trim() || `Manual Snapshot (${new Date().toLocaleTimeString()})`;
      await createCmsSnapshot(current, note);
      setNewSnapshotNote('');
      setStatusMessage({ type: 'success', text: `Safety snapshot "${note}" saved to cloud database!` });
      await loadSnapshotsList();
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to create cloud snapshot. Please check connection.' });
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleSyncToCloudNow = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const current = loadCuratedCollections();
      const ok = await syncCollectionsToFirestore(current);
      if (ok) {
        await createCmsSnapshot(current, 'Manual Cloud Sync');
        setStatusMessage({ type: 'success', text: 'Current collections synchronized to Cloud Firestore!' });
        await loadSnapshotsList();
      } else {
        setStatusMessage({ type: 'error', text: 'Could not sync to cloud. Local changes remain saved.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Sync error. Local changes remain safe.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreSnapshot = async (item: CmsSnapshotRecord) => {
    const confirmRestore = window.confirm(
      `Are you sure you want to restore the snapshot "${item.note}" from ${new Date(
        item.timestamp
      ).toLocaleString()}? This will update the live collections.`
    );
    if (!confirmRestore) return;

    setIsLoading(true);
    setStatusMessage(null);
    try {
      const restored = await restoreCmsSnapshot(item.id);
      if (restored && restored.length > 0) {
        saveCuratedCollections(restored, `Restored from snapshot: ${item.note}`);
        if (onCollectionsRestored) onCollectionsRestored(restored);
        setStatusMessage({
          type: 'success',
          text: `Successfully restored version "${item.note}". Live site updated!`,
        });
      } else {
        setStatusMessage({ type: 'error', text: 'Could not restore snapshot data.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to restore snapshot.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetFactoryDefaults = () => {
    const confirmReset = window.confirm(
      'Reset all collections back to original code defaults? (A safety backup snapshot will be recorded first).'
    );
    if (!confirmReset) return;

    const current = loadCuratedCollections();
    createCmsSnapshot(current, 'Backup before Factory Reset');
    const resetData = resetCuratedCollections();
    if (onCollectionsRestored) onCollectionsRestored(resetData);
    setStatusMessage({
      type: 'success',
      text: 'Reset back to factory defaults. Previous version backed up to cloud!',
    });
    loadSnapshotsList();
  };

  const handleDownloadJsonBackup = () => {
    const current = loadCuratedCollections();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(current, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `accessoire_collections_backup_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setStatusMessage({ type: 'success', text: 'Downloaded JSON backup file to your computer!' });
  };

  const handleCopyCodeSnippet = () => {
    const current = loadCuratedCollections();
    const tsCode = JSON.stringify(current, null, 2);
    navigator.clipboard.writeText(tsCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const gitInstructions = `git status
git add .
git commit -m "Update collections content from CMS"
git push origin main`;

  const handleCopyGitCommands = () => {
    navigator.clipboard.writeText(gitInstructions);
    setCopiedGit(true);
    setTimeout(() => setCopiedGit(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden text-stone-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>Cloud Sync & Safety Backups</span>
                <span className="text-[10px] font-mono font-normal uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                  Firebase Active
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                Live cloud synchronization, version snapshots, and GitHub / terminal export
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1 text-sm">
          {/* Status notification */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-700/80 text-emerald-200'
                  : 'bg-rose-950/70 border-rose-700/80 text-rose-200'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Cloud Sync & Manual Snapshot Bar */}
          <div className="p-4 rounded-xl bg-stone-950/70 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-300" />
                <span className="font-bold text-white text-xs uppercase tracking-wider">
                  Create Safety Snapshot
                </span>
              </div>
              <button
                type="button"
                onClick={handleSyncToCloudNow}
                disabled={isSyncing}
                className="text-xs font-semibold text-amber-300 hover:text-amber-200 underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Force Sync to Cloud'}</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newSnapshotNote}
                onChange={(e) => setNewSnapshotNote(e.target.value)}
                placeholder='Snapshot label (e.g. "Before client changes", "Ready for approval")...'
                className="flex-1 bg-stone-900 border border-stone-700 focus:border-amber-400 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleManualSnapshot}
                disabled={isCreatingSnapshot}
                className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isCreatingSnapshot ? 'Saving...' : 'Take Snapshot'}</span>
              </button>
            </div>
            <p className="text-[11px] text-stone-400">
              Snapshots save an exact frozen copy of all 15 collections, shoe pairings, and taglines to
              the cloud so you can revert at any second.
            </p>
          </div>

          {/* Snapshot History & Rollback */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-amber-300" />
                <span>Version Snapshots ({snapshots.length})</span>
              </h4>
              <button
                type="button"
                onClick={loadSnapshotsList}
                className="text-[11px] text-stone-400 hover:text-stone-200 underline cursor-pointer"
              >
                Refresh List
              </button>
            </div>

            {isLoading ? (
              <div className="p-6 text-center text-xs text-stone-400">Loading version snapshots...</div>
            ) : snapshots.length === 0 ? (
              <div className="p-6 rounded-xl bg-stone-950/40 border border-stone-800 text-center text-xs text-stone-400">
                No snapshots recorded yet. Click &ldquo;Take Snapshot&rdquo; above to record your first version!
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-3 rounded-xl bg-stone-950/80 border border-stone-800 hover:border-stone-700 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white truncate">{snap.note}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-800 text-stone-400">
                          {snap.collectionsCount} cards
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-stone-400 font-mono mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(snap.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreSnapshot(snap)}
                      className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-amber-400 hover:text-stone-950 text-stone-200 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      title="Restore this version"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export to GitHub & Terminal Section */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-300" />
              <span>Export & Commit to GitHub</span>
            </h4>
            <p className="text-xs text-stone-400">
              When your team finishes making edits in the CMS, you can export the data file and commit it
              to GitHub directly:
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadJsonBackup}
                className="px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span>Download JSON Backup</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCodeSnippet}
                className="px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied Code!' : 'Copy Data JSON'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetFactoryDefaults}
                className="px-3.5 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ml-auto"
                title="Revert back to original hardcoded code"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Factory Code</span>
              </button>
            </div>

            {/* Terminal Git Command Helper */}
            <div className="mt-3 p-3 rounded-lg bg-black border border-stone-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono">
                <span>Terminal Git Commands:</span>
                <button
                  type="button"
                  onClick={handleCopyGitCommands}
                  className="text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedGit ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedGit ? 'Copied Commands' : 'Copy Commands'}</span>
                </button>
              </div>
              <pre className="text-xs font-mono text-emerald-400 select-all overflow-x-auto p-1">
                {gitInstructions}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between">
          <span className="text-[11px] text-stone-400">
            Current catalog contains {CURATED_COLLECTIONS_DATA.length} default collections
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
