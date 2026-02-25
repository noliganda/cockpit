'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Calendar, User, FileText, FolderOpen, Users, LayoutDashboard, CheckSquare, FileEdit, ExternalLink, Trash2, Save, X, Mail, Phone, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { useTaskStore } from '@/stores/task-store';
import { useProjectStore } from '@/stores/project-store';
import { useContactStore } from '@/stores/contact-store';
import { TaskDialog } from '@/components/task-dialog';
import { Task, TASK_STATUSES, ProjectNote, ProjectDocument } from '@/types';
import { format, parseISO } from 'date-fns';
import { useLocalStorage } from '@/hooks/use-local-storage';

const PRIORITY_COLORS: Record<string, string> = { low: '#6B7280', medium: '#3B82F6', high: '#F59E0B', urgent: '#EF4444' };
const STATUS_COLORS: Record<string, string> = { active: '#10B981', paused: '#F59E0B', completed: '#6B7280', archived: '#3A3A3A' };
const DOC_ICONS: Record<string, string> = { pdf: '📄', doc: '📝', sheet: '📊', image: '🖼️', link: '🔗', other: '📎' };

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'notes', label: 'Notes', icon: FileEdit },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'people', label: 'People', icon: Users },
] as const;
type TabId = typeof TABS[number]['id'];

function renderMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/^### (.*$)/gim, '<h3 class="text-sm font-semibold text-white mt-3 mb-1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-base font-semibold text-white mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold text-white mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-[#2A2A2A] px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/^\s*-\s+(.*$)/gim, '<li class="text-sm text-[#A0A0A0] ml-4">• $1</li>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:underline" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, '<br/>');
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);
  const { tasks, addTask, updateTask, deleteTask } = useTaskStore();
  const { getProjectById, deleteProject, updateProject } = useProjectStore();
  const { contacts } = useContactStore();
  const statuses = TASK_STATUSES;
  const router = useRouter();
  const project = getProjectById(id);
  const projectTasks = tasks.filter(t => t.projectId === id);
  const projectContacts = contacts.filter(c => c.workspaceId === workspace.id && (c.projectIds?.includes(id) || c.tags?.includes(project?.name || '') || c.tags?.includes(id)));

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [editProjectOpen, setEditProjectOpen] = useState(false);

  // Notes
  const [notes, setNotes] = useLocalStorage<ProjectNote[]>(`project_notes_${id}`, []);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  // Documents
  const [documents, setDocuments] = useLocalStorage<ProjectDocument[]>(`project_docs_${id}`, []);
  const [docFormOpen, setDocFormOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docType, setDocType] = useState<ProjectDocument['type']>('link');

  if (!project) {
    return (
      <div className="p-6"><div className="text-center py-20">
        <p className="text-[#A0A0A0] text-sm">Project not found</p>
        <Link href="/projects" className="mt-3 text-xs font-medium" style={{ color: accentColor }}>← Back to projects</Link>
      </div></div>
    );
  }

  // Note helpers
  const saveNote = () => {
    const now = new Date().toISOString();
    if (selectedNoteId) {
      setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, title: noteTitle.trim() || n.title, content: noteContent, updatedAt: now } : n));
    } else {
      const newNote: ProjectNote = { id: `note-${Date.now()}`, projectId: id, title: noteTitle.trim() || 'Untitled Note', content: noteContent, createdAt: now, updatedAt: now };
      setNotes(prev => [...prev, newNote]);
      setSelectedNoteId(newNote.id);
    }
    setNoteEditorOpen(false);
  };
  const deleteNote = (nid: string) => { setNotes(prev => prev.filter(n => n.id !== nid)); if (selectedNoteId === nid) { setSelectedNoteId(null); setNoteTitle(''); setNoteContent(''); } };
  const startEdit = (n: ProjectNote) => { setSelectedNoteId(n.id); setNoteTitle(n.title); setNoteContent(n.content); setNoteEditorOpen(true); setPreviewMode(false); };
  const startNew = () => { setSelectedNoteId(null); setNoteTitle(''); setNoteContent(''); setNoteEditorOpen(true); setPreviewMode(false); };

  // Doc helpers
  const addDoc = () => { if (!docName.trim() || !docUrl.trim()) return; setDocuments(prev => [...prev, { id: `doc-${Date.now()}`, projectId: id, name: docName.trim(), type: docType, url: docUrl.trim(), addedAt: new Date().toISOString() }]); setDocFormOpen(false); setDocName(''); setDocUrl(''); };
  const delDoc = (did: string) => setDocuments(prev => prev.filter(d => d.id !== did));

  // Task helpers
  const handleSaveTask = (td: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => { const data = { ...td, projectId: id }; editingTask ? updateTask(editingTask.id, data) : addTask(data); setEditingTask(undefined); };

  // Stats
  const taskCount = projectTasks.length;
  const completedCount = projectTasks.filter(t => ['delivered', 'paid', 'won', 'completed'].includes(t.status)).length;
  const inProgressCount = projectTasks.filter(t => !['backlog', 'lead', 'delivered', 'paid', 'won', 'completed', 'lost', 'archived'].includes(t.status)).length;
  const progressPercent = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-xs text-[#A0A0A0] hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> All Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{project.name}</h1>
            {project.description && <p className="text-sm text-[#A0A0A0] mt-0.5">{project.description}</p>}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: `${STATUS_COLORS[project.status]}20`, color: STATUS_COLORS[project.status] }}>{project.status}</span>
              {project.startDate && <span className="text-xs text-[#A0A0A0]">Started {project.startDate}</span>}
              {project.endDate && <span className="text-xs text-[#A0A0A0]">Due {project.endDate}</span>}
              {project.budget && <span className="text-xs font-medium" style={{ color: accentColor }}>${project.budget.toLocaleString()}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setEditProjectOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[#2A2A2A] text-[#A0A0A0] hover:text-white hover:border-[#3A3A3A] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                  deleteProject(id);
                  router.push('/projects');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="border-b border-[#2A2A2A] mb-6">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative ${activeTab === tab.id ? 'text-white' : 'text-[#6B7280] hover:text-[#A0A0A0]'}`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'tasks' && taskCount > 0 && <span className="text-[10px] bg-[#2A2A2A] px-1.5 py-0.5 rounded-full">{taskCount}</span>}
              {tab.id === 'notes' && notes.length > 0 && <span className="text-[10px] bg-[#2A2A2A] px-1.5 py-0.5 rounded-full">{notes.length}</span>}
              {tab.id === 'documents' && documents.length > 0 && <span className="text-[10px] bg-[#2A2A2A] px-1.5 py-0.5 rounded-full">{documents.length}</span>}
              {activeTab === tab.id && <motion.div layoutId="projectTab" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: accentColor }} />}
            </button>
          ))}
        </div>
      </div>

      {/* ===== OVERVIEW ===== */}
      {activeTab === 'overview' && (
        <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Tasks', value: taskCount, color: 'white' },
              { label: 'Completed', value: completedCount, color: '#10B981' },
              { label: 'In Progress', value: inProgressCount, color: '#F59E0B' },
              { label: 'Notes', value: notes.length, color: 'white' },
            ].map(s => (
              <div key={s.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <p className="text-xs text-[#6B7280] mb-1">{s.label}</p>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white">Progress</p>
              <p className="text-sm font-medium" style={{ color: accentColor }}>{progressPercent}%</p>
            </div>
            <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div className="h-full transition-all duration-500 rounded-full" style={{ width: `${progressPercent}%`, background: accentColor }} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { tab: 'tasks' as TabId, icon: CheckSquare, title: 'Tasks', desc: `${taskCount} tasks` },
              { tab: 'notes' as TabId, icon: FileEdit, title: 'Notes', desc: `${notes.length} notes` },
              { tab: 'documents' as TabId, icon: FolderOpen, title: 'Documents', desc: `${documents.length} docs` },
            ].map(q => (
              <button key={q.tab} onClick={() => setActiveTab(q.tab)} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#3A3A3A] transition-colors text-left">
                <q.icon className="w-5 h-5 mb-2" style={{ color: accentColor }} />
                <p className="text-sm font-medium text-white">{q.title}</p>
                <p className="text-xs text-[#6B7280] mt-0.5">{q.desc}</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ===== TASKS ===== */}
      {activeTab === 'tasks' && (
        <motion.div key="tasks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#A0A0A0]">{taskCount} tasks</p>
            <button onClick={() => { setEditingTask(undefined); setDialogOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg" style={{ background: accentColor, color: '#0F0F0F' }}>
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>
          {projectTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 bg-[#1A1A1A] border border-[#2A2A2A] border-dashed rounded-xl">
              <p className="text-sm text-[#A0A0A0]">No tasks yet</p>
              <button onClick={() => { setEditingTask(undefined); setDialogOpen(true); }} className="mt-3 text-xs font-medium" style={{ color: accentColor }}>+ Add your first task</button>
            </div>
          ) : (
            <div className="space-y-6">
              {statuses.map(status => {
                const st = projectTasks.filter(t => t.status === status.id);
                if (!st.length) return null;
                return (
                  <div key={status.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: status.color }} />
                      <span className="text-xs font-semibold text-white">{status.name}</span>
                      <span className="text-xs text-[#A0A0A0] bg-[#2A2A2A] px-1.5 py-0.5 rounded-full">{st.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {st.map((task, i) => (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg hover:border-[#3A3A3A] transition-colors group">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PRIORITY_COLORS[task.priority] }} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-white">{task.title}</span>
                            {task.tags.length > 0 && <div className="flex gap-1 mt-0.5">{task.tags.slice(0, 3).map(tag => <span key={tag} className="text-xs text-[#6B7280]">#{tag}</span>)}</div>}
                          </div>
                          {task.assignee && <span className="hidden md:flex items-center gap-1 text-xs text-[#A0A0A0]"><User className="w-3 h-3" />{task.assignee}</span>}
                          {task.dueDate && <span className="hidden sm:flex items-center gap-1 text-xs text-[#A0A0A0]"><Calendar className="w-3 h-3" />{format(parseISO(task.dueDate), 'MMM d')}</span>}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingTask(task); setDialogOpen(true); }} className="px-2 py-1 text-xs text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A] rounded">Edit</button>
                            <button onClick={() => deleteTask(task.id)} className="px-2 py-1 text-xs text-[#A0A0A0] hover:text-red-400 hover:bg-[#2A2A2A] rounded">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ===== NOTES ===== */}
      {activeTab === 'notes' && (
        <motion.div key="notes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 280px)' }}>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
              <p className="text-sm font-medium text-white">Notes</p>
              <button onClick={startNew} className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded" style={{ background: accentColor, color: '#0F0F0F' }}><Plus className="w-3 h-3" />New</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {notes.length === 0 ? <p className="text-xs text-[#6B7280] text-center py-4">No notes yet</p> : notes.map(n => (
                <button key={n.id} onClick={() => startEdit(n)} className={`w-full text-left p-3 rounded-lg transition-colors ${selectedNoteId === n.id ? 'bg-[#2A2A2A]' : 'hover:bg-[#252525]'}`}>
                  <p className="text-sm font-medium text-white truncate">{n.title}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{format(parseISO(n.updatedAt), 'MMM d, h:mm a')}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden flex flex-col">
            {noteEditorOpen ? (
              <>
                <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
                  <input type="text" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Note title..." className="flex-1 bg-transparent text-sm font-medium text-white placeholder:text-[#6B7280] focus:outline-none" />
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPreviewMode(!previewMode)} className={`px-2 py-1 text-xs rounded ${previewMode ? 'bg-[#2A2A2A] text-white' : 'text-[#6B7280] hover:text-white'}`}>Preview</button>
                    <button onClick={saveNote} className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded" style={{ background: accentColor, color: '#0F0F0F' }}><Save className="w-3 h-3" />Save</button>
                    <button onClick={() => { setNoteEditorOpen(false); setSelectedNoteId(null); }} className="p-1 text-[#6B7280] hover:text-white"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {previewMode ? (
                    <div className="h-full p-4 overflow-y-auto text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(noteContent) }} />
                  ) : (
                    <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Write your notes here... (Markdown supported)" className="w-full h-full p-4 bg-[#0F0F0F] text-sm text-white placeholder:text-[#6B7280] focus:outline-none resize-none font-mono" />
                  )}
                </div>
              </>
            ) : selectedNoteId && notes.find(n => n.id === selectedNoteId) ? (() => { const note = notes.find(n => n.id === selectedNoteId)!; return (
              <>
                <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{note.title}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(note)} className="px-2 py-1 text-xs text-[#A0A0A0] hover:text-white rounded">Edit</button>
                    <button onClick={() => deleteNote(note.id)} className="p-1 text-red-400 hover:bg-red-400/10 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4"><div className="text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }} /></div>
              </>
            ); })() : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <FileText className="w-8 h-8 text-[#3A3A3A] mb-3" />
                <p className="text-sm text-[#6B7280]">Select a note or create a new one</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ===== DOCUMENTS ===== */}
      {activeTab === 'documents' && (
        <motion.div key="documents" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#A0A0A0]">{documents.length} documents</p>
            <button onClick={() => setDocFormOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg" style={{ background: accentColor, color: '#0F0F0F' }}><Plus className="w-4 h-4" />Add Document</button>
          </div>
          {docFormOpen && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 mb-4">
              <div className="flex flex-col md:flex-row gap-3">
                <input type="text" value={docName} onChange={e => setDocName(e.target.value)} placeholder="Document name" className="flex-1 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A]" />
                <select value={docType} onChange={e => setDocType(e.target.value as ProjectDocument['type'])} className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                  <option value="link">Link</option><option value="pdf">PDF</option><option value="doc">Doc</option><option value="sheet">Sheet</option><option value="image">Image</option><option value="other">Other</option>
                </select>
                <input type="text" value={docUrl} onChange={e => setDocUrl(e.target.value)} placeholder="URL" className="flex-1 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A]" />
                <div className="flex gap-2">
                  <button onClick={addDoc} disabled={!docName.trim() || !docUrl.trim()} className="px-3 py-2 text-sm font-medium rounded-lg disabled:opacity-40" style={{ background: accentColor, color: '#0F0F0F' }}><Save className="w-4 h-4" /></button>
                  <button onClick={() => setDocFormOpen(false)} className="p-2 text-[#6B7280] hover:text-white"><X className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          )}
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 bg-[#1A1A1A] border border-[#2A2A2A] border-dashed rounded-xl">
              <p className="text-sm text-[#A0A0A0]">No documents yet</p>
              <button onClick={() => setDocFormOpen(true)} className="mt-3 text-xs font-medium" style={{ color: accentColor }}>+ Add your first document</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-[#3A3A3A] transition-colors group">
                  <span className="text-xl">{DOC_ICONS[doc.type] || '📎'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">{doc.type.toUpperCase()} · {format(parseISO(doc.addedAt), 'MMM d')}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A] rounded"><ExternalLink className="w-3.5 h-3.5" /></a>
                    <button onClick={() => delDoc(doc.id)} className="p-1.5 text-[#A0A0A0] hover:text-red-400 hover:bg-[#2A2A2A] rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ===== PEOPLE ===== */}
      {activeTab === 'people' && (
        <motion.div key="people" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#A0A0A0]">{projectContacts.length} people</p>
          </div>
          {projectContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 bg-[#1A1A1A] border border-[#2A2A2A] border-dashed rounded-xl">
              <Users className="w-8 h-8 text-[#3A3A3A] mb-3" />
              <p className="text-sm text-[#A0A0A0]">No contacts linked to this project</p>
              <p className="text-xs text-[#6B7280] mt-1">Tag contacts with the project name in CRM to link them here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projectContacts.map(c => (
                <Link key={c.id} href={`/crm/${c.id}`} className="flex items-center gap-4 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-[#3A3A3A] transition-colors">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: `${accentColor}20`, color: accentColor }}>
                    {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{c.name}</p>
                    {(c.role || c.company) && <p className="text-xs text-[#A0A0A0] mt-0.5">{[c.role, c.company].filter(Boolean).join(' · ')}</p>}
                  </div>
                  <div className="flex gap-2 text-[#6B7280]">
                    {c.email && <Mail className="w-3.5 h-3.5" />}
                    {c.phone && <Phone className="w-3.5 h-3.5" />}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      )}

      <TaskDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingTask(undefined); }}
        onSave={handleSaveTask}
        workspaceId={workspace.id}
        initialTask={editingTask}
        initialProjectId={id}
        projects={[project]}
        accentColor={accentColor}
      />

      {/* Edit Project Dialog */}
      {editProjectOpen && (() => {
        const EditDialog = () => {
          const [name, setName] = useState(project.name);
          const [description, setDescription] = useState(project.description || '');
          const [status, setStatus] = useState(project.status);
          const [startDate, setStartDate] = useState(project.startDate || '');
          const [endDate, setEndDate] = useState(project.endDate || '');
          const [budget, setBudget] = useState(project.budget?.toString() || '');

          const handleSave = () => {
            if (!name.trim()) return;
            updateProject(id, {
              name: name.trim(),
              description: description.trim() || undefined,
              status,
              startDate: startDate || undefined,
              endDate: endDate || undefined,
              budget: budget ? parseFloat(budget) : undefined,
            });
            setEditProjectOpen(false);
          };

          const INP = 'w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A]';
          const LBL = 'block text-xs font-medium text-[#A0A0A0] mb-1.5';

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditProjectOpen(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-white">Edit Project</h2>
                  <button onClick={() => setEditProjectOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#2A2A2A]"><X className="w-4 h-4 text-[#A0A0A0]" /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={LBL}>Name *</label>
                    <input autoFocus value={name} onChange={e => setName(e.target.value)} className={INP} />
                  </div>
                  <div>
                    <label className={LBL}>Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={`${INP} resize-none`} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={LBL}>Status</label>
                      <select value={status} onChange={e => setStatus(e.target.value as typeof status)} className={INP}>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div>
                      <label className={LBL}>Start Date</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={INP} />
                    </div>
                    <div>
                      <label className={LBL}>End Date</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={INP} />
                    </div>
                  </div>
                  <div>
                    <label className={LBL}>Budget (AUD)</label>
                    <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0" className={INP} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => setEditProjectOpen(false)} className="px-4 py-2 text-sm text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A] rounded-lg">Cancel</button>
                  <button onClick={handleSave} disabled={!name.trim()} className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-40" style={{ background: accentColor, color: '#0F0F0F' }}>Save Changes</button>
                </div>
              </motion.div>
            </div>
          );
        };
        return <EditDialog />;
      })()}
    </div>
  );
}
