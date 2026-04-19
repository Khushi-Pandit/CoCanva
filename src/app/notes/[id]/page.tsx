'use client';
/**
 * Notes Editor Page — /notes/[id]
 *
 * Full canvas experience (Toolbar, TopBar, AI, Voice, Annotations, Branch, Connector)
 * PLUS: fixed A4 page, PageNavigator sidebar, per-page element isolation.
 *
 * Key fixes applied:
 * - notesStore.reset() on init to clear stale state from previous sessions
 * - Socket canvas:state filtered by pageIndex (prevents all-pages overlap)
 * - pageIndex correctly tagged on every element emit/save
 * - switchPage saves first, then clears store, then loads new page elements
 * - export properly captures the HTML5 canvas element
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useCanvasStore } from '@/store/canvas.store';
import { useUIStore } from '@/store/ui.store';
import { useCollaboration } from '@/lib/socket/useCollaboration';
import { useVoice } from '@/lib/socket/useVoice';
import { canvasApi } from '@/lib/api/canvas.api';
import { elementApi } from '@/lib/api/element.api';
import { pageApi, PageMeta } from '@/lib/api/page.api';
import { toAPI, generateId, fromAPI } from '@/lib/element.transform';
import { DrawableElement, isStroke, isShape, isFlowchart, isTextElement, isConnector } from '@/types/element';
import { PAGE_DIMENSIONS, PageSize } from '@/types/canvas';
import { thumbnailApi, aiApi } from '@/lib/api/ai.api';

import { CanvasEngine } from '@/components/canvas/CanvasEngine';
import { Toolbar } from '@/components/canvas/Toolbar';
import { TopBar } from '@/components/canvas/TopBar';
import { AIChatPanel } from '@/components/ai/AIChatPanel';
import { GhostAcceptBar } from '@/components/ai/GhostAcceptBar';
import { VoiceRoom } from '@/components/voice/VoiceRoom';
import { ShareModal } from '@/components/share/ShareModal';
import { AnnotationsPanel } from '@/components/canvas/AnnotationsPanel';
import { BranchHistoryPanel } from '@/components/canvas/BranchHistoryPanel';
import { ConnectorStylePanel } from '@/components/canvas/ConnectorStylePanel';
import { ToastContainer } from '@/components/ui/Toast';
import { PageNavigator } from '@/components/notes/PageNavigator';
import { useNotesStore } from '@/store/notes.store';
import { PanelLeftClose, PanelLeftOpen, Mic, MicOff, Sparkles } from 'lucide-react';
import { useTranscription } from '@/lib/socket/useTranscription';
import { generateNotesSVG, renderSVGToPNG } from '@/lib/notes.export';
import { NotesSummaryModal } from '@/components/notes/NotesSummaryModal';

export default function NotesPage() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const canvasId     = String(params.id);
  const shareToken   = searchParams.get('shareToken') ?? undefined;

  const { firebaseUser, loading: authLoading, getToken } = useAuthStore();
  const {
    role, history, historyIndex,
    undo, redo, elements, deletedIds,
    addElement, pushHistory, init,
    setLastSaved, setIsSyncing, replaceElements,
  } = useCanvasStore();
  const { addToast } = useUIStore();

  const socketRef = useRef<any>(null);
  const firebaseUserRef = useRef<any>(null);
  
  useEffect(() => { firebaseUserRef.current = firebaseUser; }, [firebaseUser]);

  const { isTranscribing, startTranscription, stopTranscription, error: transcriptionError } = useTranscription({
    onChunk: (text) => {
      if (socketRef.current) {
        socketRef.current.emit('voice:transcript_chunk', {
          canvasId,
          pageIndex: currentPageIdxRef.current,
          transcript: text,
          userName: firebaseUserRef.current?.displayName || 'User'
        });
      }
    }
  });

  const [token,         setToken]        = useState('');
  const [joinLoading,   setJoinLoading]  = useState(true);
  const [joiningVoice,  setJoiningVoice] = useState(false);
  const [ghostElements, setGhostElements] = useState<DrawableElement[]>([]);
  const [navOpen,       setNavOpen]      = useState(true);   // ← Issue 4: collapsible navigator

  const [pageSize,    setPageSizeState] = useState<PageSize>('a4');
  const [orientation, setOrientation]   = useState<'portrait' | 'landscape'>('portrait');
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const notesStore = useNotesStore();
  const { pages, currentPageIndex } = notesStore;

  // Stable ref for currentPageIndex inside callbacks (avoids stale closure)
  const currentPageIdxRef = useRef(currentPageIndex);
  useEffect(() => { currentPageIdxRef.current = currentPageIndex; }, [currentPageIndex]);

  const canEdit = role === 'owner' || role === 'editor';

  const dims = PAGE_DIMENSIONS[pageSize] ?? PAGE_DIMENSIONS.a4;
  const pageW = orientation === 'landscape' ? dims.height : dims.width;
  const pageH = orientation === 'landscape' ? dims.width  : dims.height;

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !firebaseUser) router.replace('/login');
  }, [authLoading, firebaseUser, router]);

  useEffect(() => {
    if (transcriptionError) addToast(transcriptionError, 'error');
  }, [transcriptionError, addToast]);

  // ── Load elements for a specific page (REST fallback) ──────────────────────
  const loadPageElements = useCallback(async (pageIdx: number) => {
    try {
      const { elements: apiEls } = await elementApi.getAll(canvasId, shareToken);
      const parsed = (apiEls ?? [])
        .map(fromAPI)
        .filter((e): e is DrawableElement => e !== null)
        .filter((e: any) => (e.pageIndex ?? 0) === pageIdx);
      useCanvasStore.getState().setElements(parsed);
      useCanvasStore.getState().setSocketElementsLoaded(true);
    } catch { /* silent */ }
  }, [canvasId, shareToken]);

  // Prevent React StrictMode from double-executing the init effect.
  // The ref persists through StrictMode's fake unmount/remount cycle,
  // so the second run sees the same canvasId and skips cleanly.
  const initializedCanvasRef = useRef<string>('');

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!firebaseUser || !canvasId) return;
    // ★ Guard: skip if we've already initialized this canvas
    if (initializedCanvasRef.current === canvasId) return;
    initializedCanvasRef.current = canvasId;

    // ★ Always reset notes store before loading a new canvas
    notesStore.reset();

    (async () => {
      const t = await getToken() ?? '';
      setToken(t);
      try {
        useCanvasStore.getState().setSocketElementsLoaded(false);
        const { canvas } = await canvasApi.get(canvasId, shareToken);
        init({ canvasId, title: canvas.title, role: canvas.myRole ?? 'viewer', shareToken });

        if (canvas.pageSize)        setPageSizeState(canvas.pageSize as PageSize);
        if (canvas.pageOrientation) setOrientation(canvas.pageOrientation as any);

        // ★ Use ensureFirst (atomic upsert) then getAll — no duplicate creation
        await pageApi.ensureFirst(canvasId);
        const pagesData: PageMeta[] = await pageApi.getAll(canvasId);
        notesStore.setPages(pagesData);
        notesStore.setCurrentPage(0);

        // Center the first page in the viewport
        const navWidth = navOpen ? 160 : 0;
        const screenW  = window.innerWidth - navWidth;
        const vx = Math.max(40, (screenW - dims.width) / 2) + navWidth;
        useCanvasStore.getState().setViewport({ x: vx, y: 60, zoom: 1 });

        // Load elements for page 0 — wait for socket, fall back to REST
        setTimeout(() => {
          if (!useCanvasStore.getState().socketElementsLoaded) {
            loadPageElements(0);
          }
        }, 2500);

      } catch (err: any) {
        const msg = err?.response?.data?.error?.message ?? 'Failed to load notes';
        addToast(msg, 'error');
        router.replace('/dashboard');
      } finally {
        setJoinLoading(false);
      }
    })();

    // Reset the guard when the component truly unmounts (different canvas navigation)
    return () => {
      // Only clear if we're navigating away (different canvas), not on StrictMode fake unmount
      // We intentionally leave initializedCanvasRef set so StrictMode second run is skipped
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, canvasId, shareToken]);

  // ── Socket collaboration ───────────────────────────────────────────────────
  const {
    socket, mySocketId,
    emitElementAdd, emitElementUpdate, emitElementDelete,
    emitElementsBatch, emitCursorMove, emitStrokePreview,
    emitCanvasClear, emitCanvasSave,
  } = useCollaboration({
    canvasId, token, shareToken,
    onCanvasJoined: (data) => {
      if (data.lastViewport) useCanvasStore.getState().setViewport(data.lastViewport);
    },
    // ★ Fix: filter socket-delivered elements to current page only
    onCanvasState: (allElements) => {
      const pageIdx = currentPageIdxRef.current;
      const pageElements = allElements.filter((e: any) => (e.pageIndex ?? 0) === pageIdx);
      useCanvasStore.getState().setElements(pageElements);
    },
  });

  // ── Voice ──────────────────────────────────────────────────────────────────
  const { inVoice, muted, participants, permissionDenied, joinVoice, leaveVoice, toggleMute } = useVoice({
    socket, canvasId, mySocketId,
  });
  const handleJoinVoice = async () => { setJoiningVoice(true); await joinVoice(); setJoiningVoice(false); };

  // ★ Auto-transcribe when joining voice room
  useEffect(() => {
    if (inVoice) {
      startTranscription();
    } else {
      stopTranscription();
    }
  }, [inVoice, startTranscription, stopTranscription]);

  // Keep socketRef updated for the transcription callback
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // ── Save (always tags current pageIndex on elements) ───────────────────────
  const handleSave = useCallback(async (silent = false) => {
    setIsSyncing(true);
    try {
      const pageIdx = currentPageIdxRef.current;
      const apiElements = useCanvasStore.getState().elements.map(el => ({
        ...toAPI(el),
        pageIndex: pageIdx,
      }));
      const dels = useCanvasStore.getState().deletedIds;
      await elementApi.bulkSave(canvasId, apiElements, dels, useCanvasStore.getState().viewport);
      setLastSaved(new Date());
      useCanvasStore.getState().clearDeletedIds();
      if (!silent) addToast('Saved', 'success', 2000);
    } catch {
      if (!silent) addToast('Save failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [canvasId, setIsSyncing, setLastSaved, addToast]);

  useEffect(() => {
    if (!canEdit) return;
    const t = setInterval(() => handleSave(true), 30000);
    return () => clearInterval(t);
  }, [canEdit, handleSave]);

  // ── Page switching: save → update index → clear → load new ────────────────
  const switchPage = useCallback(async (newPageIdx: number) => {
    if (newPageIdx === currentPageIdxRef.current) return;
    await handleSave(true);
    notesStore.setCurrentPage(newPageIdx);
    useCanvasStore.getState().setElements([]);
    useCanvasStore.getState().setSocketElementsLoaded(false);
    await loadPageElements(newPageIdx);
  }, [handleSave, notesStore, loadPageElements]);

  // ── Undo / Redo ────────────────────────────────────────────────────────────
  const broadcastDiff = useCallback((prev: DrawableElement[], curr: DrawableElement[]) => {
    const prevIds = new Set(prev.map(e => e.id));
    const currIds = new Set(curr.map(e => e.id));
    const deleted = curr.filter(e => !prevIds.has(e.id)).map(e => String(e.id));
    const added   = prev.filter(e => !currIds.has(e.id)).map(toAPI);
    const updated = prev.filter(e =>  currIds.has(e.id)).map(toAPI);
    if (added.length > 0 || updated.length > 0 || deleted.length > 0)
      emitElementsBatch(added, updated, deleted);
  }, [emitElementsBatch]);

  const handleUndo = useCallback(() => {
    const curr = useCanvasStore.getState().elements;
    const prev = undo();
    if (prev) { replaceElements(() => prev); broadcastDiff(prev, curr); }
  }, [undo, replaceElements, broadcastDiff]);

  const handleRedo = useCallback(() => {
    const curr = useCanvasStore.getState().elements;
    const next = redo();
    if (next) { replaceElements(() => next); broadcastDiff(next, curr); }
  }, [redo, replaceElements, broadcastDiff]);

  // ── Element events (always tag with current pageIndex) ──────────────────────
  const handleElementAdd = useCallback((_el: DrawableElement, apiForm: unknown) => {
    emitElementAdd({ ...(apiForm as any), pageIndex: currentPageIdxRef.current });
  }, [emitElementAdd]);

  const handleElementDelete = useCallback((ids: string[]) => {
    ids.forEach(id => {
      useCanvasStore.getState().markDeleted(id);
      useCanvasStore.getState().removeElement(id);
    });
    emitElementDelete(ids);
  }, [emitElementDelete]);

  const handleElementModify = useCallback((_el: DrawableElement, apiForm: unknown) => {
    emitElementUpdate({ ...(apiForm as any), pageIndex: currentPageIdxRef.current });
  }, [emitElementUpdate]);

  const handleStyleChange = useCallback((updates: Partial<DrawableElement>) => {
    const { selectedIds, updateElement, pushHistory: ph } = useCanvasStore.getState();
    if (!selectedIds.length) return;
    let changed = false;
    selectedIds.forEach(id => {
      updateElement(id, updates as any);
      const updated = useCanvasStore.getState().elements.find(e => e.id === id);
      if (updated) { emitElementUpdate(toAPI(updated)); changed = true; }
    });
    if (changed) ph([...useCanvasStore.getState().elements]);
  }, [emitElementUpdate]);

  const handleThumbnailCapture = useCallback(async (dataUrl: string) => {
    try { await thumbnailApi.upload(canvasId, dataUrl); } catch { /* bg */ }
  }, [canvasId]);

  // ── Ghost AI ───────────────────────────────────────────────────────────────
  const handleGhostElementsGenerated = useCallback((newGhosts: DrawableElement[]) => {
    setGhostElements(newGhosts);
    newGhosts.forEach(el => useCanvasStore.getState().addElement(el));
    addToast(`AI generated ${newGhosts.length} element(s) — Tab to accept`, 'info', 6000);
  }, [addToast]);

  const handleGhostAccept = useCallback(() => {
    ghostElements.forEach(el => {
      useCanvasStore.getState().updateElement(el.id, { isGhostSuggestion: false } as any);
      const updated = useCanvasStore.getState().elements.find(e => e.id === el.id);
      if (updated) emitElementAdd(toAPI(updated));
    });
    pushHistory([...useCanvasStore.getState().elements]);
    setGhostElements([]);
    addToast(`Accepted ${ghostElements.length} AI element(s)`, 'success', 2000);
  }, [ghostElements, pushHistory, emitElementAdd, addToast]);

  const handleGhostDismiss = useCallback(() => {
    ghostElements.forEach(el => useCanvasStore.getState().removeElement(el.id));
    setGhostElements([]);
    addToast('AI suggestions dismissed', 'info', 1500);
  }, [ghostElements, addToast]);

  // ── Export (Notes-specific) ────────────────────────────────────────────────
  const handleExport = useCallback(async (fmt: 'png' | 'svg' | 'pdf' | 'json') => {
    const canvasTitle = useCanvasStore.getState().canvasTitle ?? 'Notes';
    if (fmt === 'pdf') {
      addToast('Preparing PDF — capturing all pages…', 'info', 3000);
      try {
        const { exportNotesPDF } = await import('@/lib/notes.export');
        await exportNotesPDF({ canvasId, canvasTitle, shareToken, pages, pageW, pageH, saveCurrentPage: () => handleSave(true) });
        addToast('PDF exported!', 'success', 2000);
      } catch (e: any) { addToast(`PDF export failed: ${e?.message ?? ''}`, 'error'); }
    } else if (fmt === 'png') {
      addToast('Preparing Images ZIP — capturing all pages…', 'info', 3000);
      try {
        const { exportNotesImages } = await import('@/lib/notes.export');
        await exportNotesImages({ canvasId, canvasTitle, shareToken, pages, pageW, pageH, saveCurrentPage: () => handleSave(true) });
        addToast('Images ZIP exported!', 'success', 2000);
      } catch (e: any) { addToast(`ZIP export failed: ${e?.message ?? ''}`, 'error'); }
    } else if (fmt === 'json') {
      const { exportNotesMarkdown } = await import('@/lib/notes.export');
      exportNotesMarkdown(canvasTitle, pages, notesStore.pageSummaries);
      addToast('Markdown exported!', 'success', 2000);
    } else {
      addToast('SVG is not available for Notes. Use PDF or Images instead.', 'info', 3000);
    }
  }, [canvasId, shareToken, pages, pageW, pageH, handleSave, notesStore.pageSummaries, addToast]);

  // ── Multimodal Summarization ───────────────────────────────────────────────
  const handleSummarizePage = useCallback(async () => {
    setSummaryModalOpen(true);
    setIsGeneratingSummary(true);
    try {
      await handleSave(true); // ensure current strokes are committed
      const pageIdx = currentPageIdxRef.current;
      
      // Get all elements for this specific page
      const pageEls = useCanvasStore.getState().elements.filter((e: any) => (e.pageIndex ?? 0) === pageIdx);
      
      // 1. Generate SVG -> PNG
      const svgStr = generateNotesSVG(pageEls, pageW, pageH);
      const pngData = await renderSVGToPNG(svgStr, pageW, pageH, 1.5);
      
      if (!pngData) throw new Error('Failed to capture page image');

      // 2. Send to AI
      const res = await aiApi.summarizeNotesPage(canvasId, pngData, pageIdx);
      notesStore.setPageSummary(pageIdx, res.summary);
    } catch (e: any) {
      addToast(e.message || 'Summarization failed', 'error');
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [canvasId, pageW, pageH, notesStore, handleSave, addToast]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  const clipboardRef = useRef<DrawableElement[]>([]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.isContentEditable) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? handleRedo() : handleUndo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') { e.preventDefault(); useUIStore.getState().togglePanel('aiChatOpen'); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowRight') { e.preventDefault(); if (currentPageIdxRef.current < pages.length - 1) switchPage(currentPageIdxRef.current + 1); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowLeft')  { e.preventDefault(); if (currentPageIdxRef.current > 0) switchPage(currentPageIdxRef.current - 1); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter')      { e.preventDefault(); if (canEdit) handleAddPage(); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleUndo, handleRedo, handleSave, pages.length, canEdit]);

  // ── Page management ────────────────────────────────────────────────────────
  const handleAddPage = useCallback(async () => {
    try {
      await handleSave(true);
      const page = await pageApi.add(canvasId);
      notesStore.addPageMeta(page);
      await switchPage(page.pageIndex);
      addToast(`Added Page ${page.pageIndex + 1}`, 'success', 1500);
    } catch { addToast('Failed to add page', 'error', 2000); }
  }, [canvasId, handleSave, notesStore, switchPage, addToast]);

  const handleDeletePage = useCallback(async (pageIndex: number) => {
    if (pages.length <= 1) { addToast('Cannot delete the only page', 'error', 2000); return; }
    try {
      await pageApi.delete(canvasId, pageIndex);
      notesStore.removePageMeta(pageIndex);
      const goTo = Math.max(0, pageIndex - 1);
      // Re-fetch pages to get correct indices after deletion
      const pagesData = await pageApi.getAll(canvasId);
      notesStore.setPages(pagesData);
      notesStore.setCurrentPage(goTo);
      useCanvasStore.getState().setElements([]);
      await loadPageElements(goTo);
      addToast('Page deleted', 'success', 1500);
    } catch { addToast('Failed to delete page', 'error', 2000); }
  }, [canvasId, pages.length, notesStore, loadPageElements, addToast]);

  const handleRenamePage = useCallback(async (pageIndex: number, label: string) => {
    try {
      await pageApi.rename(canvasId, pageIndex, label);
      notesStore.updatePageMeta(pageIndex, { label });
    } catch { addToast('Rename failed', 'error', 2000); }
  }, [canvasId, notesStore, addToast]);

  const handleReorder = useCallback(async (order: number[]) => {
    try {
      await pageApi.reorder(canvasId, order);
      const pagesData = await pageApi.getAll(canvasId);
      notesStore.setPages(pagesData);
    } catch { addToast('Reorder failed', 'error', 2000); }
  }, [canvasId, notesStore, addToast]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (authLoading || joinLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f0ede8]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Opening notebook…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden select-none relative flex bg-[#f0ede8]">

      {/* ── Page Navigator (Issue 4: toggleable) ── */}
      <div
        className="flex-shrink-0 overflow-hidden transition-all duration-200"
        style={{ width: navOpen ? 160 : 0 }}
      >
        {navOpen && (
          <PageNavigator
            canEdit={canEdit}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
            onRenamePage={handleRenamePage}
            onReorder={handleReorder}
            onSwitchPage={switchPage}
          />
        )}
      </div>

      {/* ── Main canvas area ── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Canvas engine — page mode renders white page on warm background */}
        <CanvasEngine
          canEdit={canEdit}
          pageMode
          pageWidth={pageW}
          pageHeight={pageH}
          onElementAdd={handleElementAdd}
          onElementDelete={handleElementDelete}
          onElementModify={handleElementModify}
          onCursorMove={emitCursorMove}
          onStrokePreview={emitStrokePreview}
          onCanvasClear={emitCanvasClear}
          onCanvasSave={handleSave}
          onThumbnailCapture={handleThumbnailCapture}
        />

        {/* Toolbar */}
        {canEdit && <Toolbar canEdit={canEdit} onStyleChange={handleStyleChange} />}

        {/* Connector style panel */}
        {canEdit && <ConnectorStylePanel onModify={handleElementModify} />}

        {/* Top bar */}
        <TopBar
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSave={handleSave}
          onExport={handleExport}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          canEdit={canEdit}
        />

        {/* Navigator toggle button — sits just below the top bar on the left */}
        <button
          onClick={() => setNavOpen(v => !v)}
          className="absolute top-[52px] left-2 z-30 w-7 h-7 rounded-lg flex items-center justify-center bg-white/90 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white shadow-sm transition-all"
          title={navOpen ? 'Hide page list' : 'Show page list'}
        >
          {navOpen ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />}
        </button>

        {/* Voice room & Transcription */}
        <div className="absolute top-14 right-4 z-20 flex flex-col gap-2 items-end">
          <VoiceRoom
            inVoice={inVoice} muted={muted} participants={participants}
            permissionDenied={permissionDenied} joining={joiningVoice}
            onJoin={handleJoinVoice} onLeave={leaveVoice} onToggleMute={toggleMute}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSummarizePage}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full shadow-md text-xs font-bold transition-all bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300"
              title="Generate AI Summary for this page"
            >
              <Sparkles size={14} /> Summarize
            </button>
          </div>
        </div>

        {/* AI Chat Panel */}
        <AIChatPanel canvasId={canvasId} onGhostElementsGenerated={canEdit ? handleGhostElementsGenerated : undefined} mode="notes" />

        {/* Ghost Accept Bar */}
        {ghostElements.length > 0 && (
          <GhostAcceptBar count={ghostElements.length} onAccept={handleGhostAccept} onDismiss={handleGhostDismiss} />
        )}

        {/* Comments & Branch panels */}
        <AnnotationsPanel />
        <BranchHistoryPanel />

        {/* AI Summary Modal */}
        <NotesSummaryModal 
          isOpen={summaryModalOpen}
          onClose={() => setSummaryModalOpen(false)}
          isGenerating={isGeneratingSummary}
          summary={notesStore.pageSummaries[currentPageIndex] || ''}
          pageTitle={pages.find(p => p.pageIndex === currentPageIndex)?.label || `Page ${currentPageIndex + 1}`}
        />

        {/* ── Page navigation footer ── */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 pointer-events-auto">
          <button
            disabled={currentPageIndex === 0}
            onClick={() => switchPage(currentPageIndex - 1)}
            className="px-3 py-1.5 rounded-xl bg-white/95 border border-slate-200 text-slate-600 text-[11px] font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >← Prev</button>
          <span className="px-3 py-1.5 rounded-xl bg-white/95 border border-slate-200 text-slate-700 text-[11px] font-bold shadow-sm">
            Page {currentPageIndex + 1} / {pages.length}
          </span>
          <button
            disabled={currentPageIndex >= pages.length - 1}
            onClick={() => switchPage(currentPageIndex + 1)}
            className="px-3 py-1.5 rounded-xl bg-white/95 border border-slate-200 text-slate-600 text-[11px] font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >Next →</button>
          {canEdit && (
            <button onClick={handleAddPage} className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-[11px] font-bold shadow-md hover:bg-amber-600 transition-all">
              + Page
            </button>
          )}
        </div>

        <ShareModal />
        <ToastContainer />
      </div>
    </div>
  );
}
