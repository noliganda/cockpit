'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder, FolderOpen, FileText, Film, ImageIcon, Music, Archive,
  FileSpreadsheet, Search, Upload, LayoutGrid, List, ChevronRight,
  ChevronDown, Star, Download, Home, Clock, X, File,
} from 'lucide-react';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { MOCK_FILES } from '@/lib/data';
import type { FileItem } from '@/types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getAncestorIds(id: string, files: FileItem[]): string[] {
  const result: string[] = [];
  let cur: FileItem | undefined = files.find(f => f.id === id);
  while (cur?.parentId) {
    result.push(cur.parentId);
    cur = files.find(f => f.id === cur!.parentId);
  }
  return result;
}

function getBreadcrumbs(folderId: string | null, files: FileItem[]): FileItem[] {
  if (!folderId) return [];
  const path: FileItem[] = [];
  let cur: FileItem | undefined = files.find(f => f.id === folderId);
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? files.find(f => f.id === cur!.parentId) : undefined;
  }
  return path;
}

// ─── file config ──────────────────────────────────────────────────────────────

const FILE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  folder:      { icon: Folder,         color: '#F59E0B', label: 'Folder' },
  pdf:         { icon: FileText,        color: '#EF4444', label: 'PDF' },
  doc:         { icon: FileText,        color: '#3B82F6', label: 'Document' },
  video:       { icon: Film,            color: '#8B5CF6', label: 'Video' },
  image:       { icon: ImageIcon,       color: '#10B981', label: 'Image' },
  spreadsheet: { icon: FileSpreadsheet, color: '#22C55E', label: 'Spreadsheet' },
  audio:       { icon: Music,           color: '#EC4899', label: 'Audio' },
  zip:         { icon: Archive,         color: '#F97316', label: 'Archive' },
};

function FileIconEl({ type, size = 4 }: { type: FileItem['type']; size?: number }) {
  const cfg = FILE_CONFIG[type] ?? { icon: File, color: '#A0A0A0', label: 'File' };
  const Icon = cfg.icon;
  return <Icon className={`w-${size} h-${size} shrink-0`} style={{ color: cfg.color }} />;
}

// ─── folder tree ──────────────────────────────────────────────────────────────

function FolderTreeNode({
  item, items, currentFolderId, expandedIds, onNavigate, onToggle, depth,
}: {
  item: FileItem;
  items: FileItem[];
  currentFolderId: string | null;
  expandedIds: Set<string>;
  onNavigate: (id: string) => void;
  onToggle: (id: string) => void;
  depth: number;
}) {
  const children = items.filter(f => f.parentId === item.id && f.type === 'folder');
  const isActive = currentFolderId === item.id;
  const isExpanded = expandedIds.has(item.id);

  return (
    <div>
      <button
        onClick={() => { onNavigate(item.id); if (children.length) onToggle(item.id); }}
        className={`flex items-center gap-1.5 w-full text-left rounded-md text-xs transition-colors py-1 pr-2 ${
          isActive ? 'bg-[#2A2A2A] text-white' : 'text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A]/50'
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <span className="w-3 h-3 shrink-0 flex items-center justify-center">
          {children.length > 0 && (
            isExpanded
              ? <ChevronDown className="w-3 h-3" />
              : <ChevronRight className="w-3 h-3" />
          )}
        </span>
        {isActive
          ? <FolderOpen className="w-3.5 h-3.5 shrink-0 text-[#F59E0B]" />
          : <Folder     className="w-3.5 h-3.5 shrink-0 text-[#6B7280]" />
        }
        <span className="truncate">{item.name}</span>
      </button>
      {isExpanded && children.map(child => (
        <FolderTreeNode
          key={child.id} item={child} items={items}
          currentFolderId={currentFolderId} expandedIds={expandedIds}
          onNavigate={onNavigate} onToggle={onToggle} depth={depth + 1}
        />
      ))}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const allFiles = useMemo(
    () => MOCK_FILES.filter(f => f.workspaceId === workspace.id),
    [workspace.id],
  );

  const rootFolders = useMemo(
    () => allFiles.filter(f => f.parentId === null && f.type === 'folder'),
    [allFiles],
  );

  const currentItems = useMemo(
    () => allFiles.filter(f => f.parentId === currentFolderId),
    [allFiles, currentFolderId],
  );

  const recentFiles = useMemo(
    () => [...allFiles].filter(f => f.type !== 'folder').sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)).slice(0, 6),
    [allFiles],
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allFiles.filter(f => f.name.toLowerCase().includes(q));
  }, [allFiles, search]);

  const breadcrumbs = useMemo(() => getBreadcrumbs(currentFolderId, allFiles), [currentFolderId, allFiles]);

  function navigateTo(id: string | null) {
    setCurrentFolderId(id);
    setSelectedFile(null);
    setSearch('');
    if (id) {
      const ancestors = getAncestorIds(id, allFiles);
      setExpandedIds(prev => {
        const next = new Set(prev);
        ancestors.forEach(a => next.add(a));
        next.add(id);
        return next;
      });
    }
  }

  function toggleFolder(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleStar(id: string) {
    setStarredIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleItemClick(item: FileItem) {
    if (item.type === 'folder') {
      navigateTo(item.id);
    } else {
      setSelectedFile(prev => prev?.id === item.id ? null : item);
    }
  }

  const displayItems = search.trim() ? searchResults : currentItems;
  const isSearching = !!search.trim();
  const totalFiles = allFiles.filter(f => f.type !== 'folder').length;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="px-6 py-4 border-b border-[#2A2A2A] shrink-0 flex items-center gap-4"
      >
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white leading-none">Documents</h1>
          <p className="text-xs text-[#A0A0A0] mt-0.5">{totalFiles} files · {workspace.name}</p>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-0.5">
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-[#2A2A2A] text-white' : 'text-[#6B7280] hover:text-white'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-[#2A2A2A] text-white' : 'text-[#6B7280] hover:text-white'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Upload */}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors text-black"
            style={{ background: accentColor }}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
        </div>
      </motion.div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Folder Tree ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="w-52 shrink-0 border-r border-[#2A2A2A] overflow-y-auto p-3 flex flex-col gap-1"
        >
          {/* My Drive root */}
          <button
            onClick={() => navigateTo(null)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs w-full text-left transition-colors ${
              currentFolderId === null && !isSearching
                ? 'bg-[#2A2A2A] text-white'
                : 'text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A]/50'
            }`}
          >
            <Home className="w-3.5 h-3.5 shrink-0 text-[#6B7280]" />
            <span className="font-medium">My Drive</span>
          </button>

          {/* Starred (if any) */}
          {starredIds.size > 0 && (
            <button className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs w-full text-left text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A]/50 transition-colors">
              <Star className="w-3.5 h-3.5 shrink-0 text-[#F59E0B]" />
              <span>Starred</span>
            </button>
          )}

          <div className="mt-1 border-t border-[#2A2A2A] pt-2">
            <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium px-2 mb-1">Folders</p>
            {rootFolders.map(folder => (
              <FolderTreeNode
                key={folder.id}
                item={folder}
                items={allFiles}
                currentFolderId={currentFolderId}
                expandedIds={expandedIds}
                onNavigate={navigateTo}
                onToggle={toggleFolder}
                depth={0}
              />
            ))}
          </div>
        </motion.div>

        {/* ── Main Content ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex-1 overflow-y-auto"
        >
          <div className="p-5">
            {/* Breadcrumb */}
            {!isSearching && (
              <div className="flex items-center gap-1 text-xs text-[#6B7280] mb-5">
                <button onClick={() => navigateTo(null)} className="hover:text-white transition-colors">
                  My Drive
                </button>
                {breadcrumbs.map(crumb => (
                  <span key={crumb.id} className="flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                    <button
                      onClick={() => navigateTo(crumb.id)}
                      className={`hover:text-white transition-colors ${currentFolderId === crumb.id ? 'text-white font-medium' : ''}`}
                    >
                      {crumb.name}
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search heading */}
            {isSearching && (
              <p className="text-xs text-[#A0A0A0] mb-5">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for &ldquo;<span className="text-white">{search}</span>&rdquo;
              </p>
            )}

            {/* Recent Files — shown at root when not searching */}
            {!isSearching && currentFolderId === null && recentFiles.length > 0 && (
              <div className="mb-7">
                <div className="flex items-center gap-1.5 mb-3">
                  <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
                  <p className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wider">Recent</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {recentFiles.map(f => {
                    const parent = allFiles.find(p => p.id === f.parentId);
                    return (
                      <button
                        key={f.id}
                        onClick={() => handleItemClick(f)}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          selectedFile?.id === f.id
                            ? 'bg-[#2A2A2A] border-[#3A3A3A]'
                            : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#3A3A3A] hover:bg-[#222]'
                        }`}
                      >
                        <FileIconEl type={f.type} size={5} />
                        <p className="text-white text-[11px] font-medium mt-2 leading-tight truncate">{f.name}</p>
                        {parent && <p className="text-[10px] text-[#6B7280] mt-0.5 truncate">{parent.name}</p>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Folder Contents / Search Results */}
            {displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Folder className="w-10 h-10 text-[#3A3A3A] mb-3" />
                <p className="text-sm text-[#6B7280]">
                  {isSearching ? 'No files match your search' : 'This folder is empty'}
                </p>
              </div>
            ) : (
              <>
                {!isSearching && currentFolderId !== null && (
                  <p className="text-xs text-[#6B7280] mb-3 uppercase tracking-wider font-medium">
                    {displayItems.filter(f => f.type === 'folder').length > 0 ? 'Contents' : 'Files'} · {displayItems.length} item{displayItems.length !== 1 ? 's' : ''}
                  </p>
                )}
                {isSearching && (
                  <p className="text-xs text-[#6B7280] mb-3 uppercase tracking-wider font-medium">Results</p>
                )}

                {view === 'grid' ? (
                  /* ── Grid View ── */
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    {displayItems.map((item, i) => {
                      const isSelected = selectedFile?.id === item.id;
                      const isStarred = starredIds.has(item.id);
                      const parent = isSearching ? allFiles.find(f => f.id === item.parentId) : null;
                      return (
                        <motion.button
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2, delay: i * 0.03 }}
                          onClick={() => handleItemClick(item)}
                          className={`relative text-left p-3 rounded-xl border transition-all group ${
                            isSelected
                              ? 'bg-[#2A2A2A] border-[#3A3A3A]'
                              : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#3A3A3A] hover:bg-[#222]'
                          }`}
                        >
                          {isStarred && (
                            <Star className="absolute top-2 right-2 w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />
                          )}
                          <FileIconEl type={item.type} size={6} />
                          <p className="text-white text-[11px] font-medium mt-2 leading-tight line-clamp-2">{item.name}</p>
                          {isSearching && parent && (
                            <p className="text-[10px] text-[#6B7280] mt-0.5 truncate">{parent.name}</p>
                          )}
                          {item.type !== 'folder' && item.size && (
                            <p className="text-[10px] text-[#6B7280] mt-0.5">{formatSize(item.size)}</p>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  /* ── List View ── */
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
                    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 px-4 py-2 border-b border-[#2A2A2A] text-[10px] text-[#6B7280] uppercase tracking-wider font-medium">
                      <span />
                      <span>Name</span>
                      <span className="text-right">Type</span>
                      <span className="text-right">Size</span>
                      <span className="text-right">Modified</span>
                    </div>
                    {displayItems.map((item, i) => {
                      const isSelected = selectedFile?.id === item.id;
                      const isStarred = starredIds.has(item.id);
                      const cfg = FILE_CONFIG[item.type];
                      const parent = isSearching ? allFiles.find(f => f.id === item.parentId) : null;
                      return (
                        <motion.button
                          key={item.id}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.02 }}
                          onClick={() => handleItemClick(item)}
                          className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 items-center px-4 py-2.5 w-full text-left transition-colors border-b border-[#2A2A2A] last:border-b-0 ${
                            isSelected ? 'bg-[#2A2A2A]' : 'hover:bg-[#2A2A2A]/40'
                          }`}
                        >
                          <FileIconEl type={item.type} size={4} />
                          <div className="min-w-0">
                            <span className="text-sm text-white truncate block">{item.name}</span>
                            {isSearching && parent && (
                              <span className="text-[11px] text-[#6B7280] truncate block">{parent.name}</span>
                            )}
                          </div>
                          <span className="text-xs text-[#6B7280] text-right">{cfg?.label ?? '—'}</span>
                          <span className="text-xs text-[#6B7280] text-right w-16">
                            {item.type !== 'folder' && item.size ? formatSize(item.size) : '—'}
                          </span>
                          <div className="flex items-center gap-2 justify-end">
                            {isStarred && <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />}
                            <span className="text-xs text-[#6B7280] w-24 text-right">{formatDate(item.modifiedAt)}</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* ── Detail Panel ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {selectedFile && (
            <motion.div
              initial={{ opacity: 0, x: 16, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 256 }}
              exit={{ opacity: 0, x: 16, width: 0 }}
              transition={{ duration: 0.25 }}
              className="shrink-0 border-l border-[#2A2A2A] overflow-y-auto overflow-x-hidden"
            >
              <div className="p-4 w-64">
                {/* Close */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">Details</span>
                  <button onClick={() => setSelectedFile(null)} className="text-[#6B7280] hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Icon */}
                <div className="flex flex-col items-center py-6 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] mb-4">
                  <FileIconEl type={selectedFile.type} size={10} />
                  <p className="text-white text-sm font-medium mt-3 text-center px-2 break-words leading-snug">
                    {selectedFile.name}
                  </p>
                  <span className="text-[10px] text-[#6B7280] mt-1">
                    {FILE_CONFIG[selectedFile.type]?.label ?? 'File'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mb-5">
                  <button
                    onClick={() => toggleStar(selectedFile.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs border transition-colors ${
                      starredIds.has(selectedFile.id)
                        ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]'
                        : 'bg-[#1A1A1A] border-[#2A2A2A] text-[#A0A0A0] hover:text-white hover:border-[#3A3A3A]'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${starredIds.has(selectedFile.id) ? 'fill-[#F59E0B]' : ''}`} />
                    {starredIds.has(selectedFile.id) ? 'Starred' : 'Star'}
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs border bg-[#1A1A1A] border-[#2A2A2A] text-[#A0A0A0] hover:text-white hover:border-[#3A3A3A] transition-colors">
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>

                {/* Metadata */}
                <div className="space-y-3">
                  {selectedFile.size && (
                    <div>
                      <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-0.5">Size</p>
                      <p className="text-sm text-white">{formatSize(selectedFile.size)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-0.5">Modified</p>
                    <p className="text-sm text-white">{formatDate(selectedFile.modifiedAt)}</p>
                  </div>
                  {selectedFile.owner && (
                    <div>
                      <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-0.5">Owner</p>
                      <p className="text-sm text-white">{selectedFile.owner}</p>
                    </div>
                  )}
                  {(() => {
                    const parent = allFiles.find(f => f.id === selectedFile.parentId);
                    return parent ? (
                      <div>
                        <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-0.5">Location</p>
                        <button
                          onClick={() => navigateTo(parent.id)}
                          className="text-sm text-[#3B82F6] hover:underline flex items-center gap-1"
                        >
                          <Folder className="w-3 h-3" />
                          {parent.name}
                        </button>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
