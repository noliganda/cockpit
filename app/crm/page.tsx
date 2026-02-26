'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Mail, Phone, Globe, Plus, Users, Building2, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { useContactStore } from '@/stores/contact-store';
import { useOrganisationStore } from '@/stores/organisation-store';
import { useProjectStore } from '@/stores/project-store';
import { ContactDialog } from '@/components/contact-dialog';
import { Contact, Organisation, getPipelineForWorkspace } from '@/types';


type Tab = 'people' | 'organisations';
type View = 'list' | 'pipeline';

export default function CRMPage() {
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);
  const { getContactsForWorkspace, addContact, updateContact, deleteContact } = useContactStore();
  const { getOrganisationsForWorkspace, addOrganisation, updateOrganisation, deleteOrganisation } = useOrganisationStore();
  const { projects } = useProjectStore();

  const [tab, setTab] = useState<Tab>('people');
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [view, setView] = useState<View>('list');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>();
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organisation | undefined>();
  const [orgForm, setOrgForm] = useState({ name: '', industry: '', website: '', phone: '', email: '', address: '', notes: '' });

  const allContacts = getContactsForWorkspace(workspace.id);
  const allOrgs = getOrganisationsForWorkspace(workspace.id);
  const wsProjects = useMemo(() => projects.filter(p => p.workspaceId === workspace.id), [projects, workspace.id]);
  const stages = getPipelineForWorkspace(workspace.id);

  const filteredContacts = useMemo(() => {
    return allContacts.filter(c => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
      const matchStage = filterStage === 'all' || c.pipelineStage === filterStage;
      return matchSearch && matchStage;
    });
  }, [allContacts, search, filterStage]);

  const filteredOrgs = useMemo(() => {
    return allOrgs.filter(o => {
      const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.industry?.toLowerCase().includes(search.toLowerCase());
      const matchStage = filterStage === 'all' || o.pipelineStage === filterStage;
      return matchSearch && matchStage;
    });
  }, [allOrgs, search, filterStage]);

  const handleSaveContact = (contactData: Omit<Contact, 'id'>) => {
    if (editingContact) { updateContact(editingContact.id, contactData); } else { addContact(contactData); }
    setEditingContact(undefined);
  };

  const openEditContact = (c: Contact) => { setEditingContact(c); setDialogOpen(true); };
  const openCreateContact = () => { setEditingContact(undefined); setDialogOpen(true); };

  const openEditOrg = (o: Organisation) => {
    setEditingOrg(o);
    setOrgForm({ name: o.name, industry: o.industry || '', website: o.website || '', phone: o.phone || '', email: o.email || '', address: o.address || '', notes: o.notes || '' });
    setOrgDialogOpen(true);
  };
  const openCreateOrg = () => {
    setEditingOrg(undefined);
    setOrgForm({ name: '', industry: '', website: '', phone: '', email: '', address: '', notes: '' });
    setOrgDialogOpen(true);
  };
  const handleSaveOrg = () => {
    if (!orgForm.name.trim()) return;
    const data = { ...orgForm, workspaceId: workspace.id, tags: [] as string[], pipelineStage: undefined };
    if (editingOrg) { updateOrganisation(editingOrg.id, data); } else { addOrganisation(data); }
    setOrgDialogOpen(false);
    setEditingOrg(undefined);
  };

  const getOrgName = (orgId?: string) => allOrgs.find(o => o.id === orgId)?.name;
  const getProjectNames = (projectIds?: string[]) => projectIds?.map(pid => wsProjects.find(p => p.id === pid)?.name).filter(Boolean) || [];

  const totalCount = tab === 'people' ? allContacts.length : allOrgs.length;

  return (
    <div className="p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">CRM</h1>
          <p className="text-sm text-[#A0A0A0] mt-0.5">{allContacts.length} contacts · {allOrgs.length} organisations · {workspace.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'people' && (
            <>
              <button onClick={() => setView('list')} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${view === 'list' ? 'text-white bg-[#2A2A2A]' : 'text-[#A0A0A0] hover:text-white'}`}>List</button>
              <button onClick={() => setView('pipeline')} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${view === 'pipeline' ? 'text-white bg-[#2A2A2A]' : 'text-[#A0A0A0] hover:text-white'}`}>Pipeline</button>
            </>
          )}
          <button
            onClick={tab === 'people' ? openCreateContact : openCreateOrg}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg"
            style={{ background: accentColor, color: '#0F0F0F' }}
          >
            <Plus className="w-4 h-4" />
            {tab === 'people' ? 'New Contact' : 'New Organisation'}
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="border-b border-[#2A2A2A] mb-5">
        <div className="flex gap-1">
          {[
            { id: 'people' as Tab, label: 'People', icon: Users, count: allContacts.length },
            { id: 'organisations' as Tab, label: 'Organisations', icon: Building2, count: allOrgs.length },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); setFilterStage('all'); }} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative ${tab === t.id ? 'text-white' : 'text-[#6B7280] hover:text-[#A0A0A0]'}`}>
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.count > 0 && <span className="text-[10px] bg-[#2A2A2A] px-1.5 py-0.5 rounded-full">{t.count}</span>}
              {tab === t.id && <motion.div layoutId="crmTab" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: accentColor }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === 'people' ? 'Search contacts...' : 'Search organisations...'} className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3A3A3A]" />
        </div>
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-[#A0A0A0] focus:outline-none focus:border-[#3A3A3A]">
          <option value="all">All Stages</option>
          {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* ===== PEOPLE TAB ===== */}
      {tab === 'people' && view === 'list' && (
        <div className="space-y-2">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-12"><p className="text-sm text-[#A0A0A0]">No contacts found</p><button onClick={openCreateContact} className="mt-3 text-xs font-medium" style={{ color: accentColor }}>+ Add your first contact</button></div>
          ) : filteredContacts.map((contact, i) => {
            const stageDef = stages.find(s => s.id === contact.pipelineStage);
            const stageColor = stageDef?.color ?? '#6B7280';
            const orgName = getOrgName(contact.organisationId);
            const linkedProjects = getProjectNames(contact.projectIds);
            return (
              <motion.div key={contact.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: i * 0.03 }}>
                <Link href={`/crm/${contact.id}`}>
                  <div className="flex items-center gap-4 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-[#3A3A3A] transition-colors group">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: `${accentColor}20`, color: accentColor }}>
                      {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{contact.name}</span>
                        {contact.pipelineStage && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${stageColor}20`, color: stageColor }}>{stageDef?.name ?? contact.pipelineStage}</span>}
                      </div>
                      <div className="text-xs text-[#A0A0A0] mt-0.5 flex items-center gap-1 flex-wrap">
                        {contact.role && <span>{contact.role}</span>}
                        {contact.role && (orgName || contact.company) && <span className="text-[#3A3A3A]">·</span>}
                        {orgName ? (
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{orgName}</span>
                        ) : contact.company ? (
                          <span>{contact.company}</span>
                        ) : null}
                        {linkedProjects.length > 0 && (
                          <>
                            <span className="text-[#3A3A3A]">·</span>
                            <span className="flex items-center gap-1"><FolderOpen className="w-3 h-3" />{linkedProjects.join(', ')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-4 shrink-0">
                      {contact.email && <span className="flex items-center gap-1 text-xs text-[#A0A0A0]"><Mail className="w-3.5 h-3.5" /><span className="hidden lg:block">{contact.email}</span></span>}
                      {contact.phone && <span className="flex items-center gap-1 text-xs text-[#A0A0A0]"><Phone className="w-3.5 h-3.5" /><span className="hidden lg:block">{contact.phone}</span></span>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.preventDefault(); openEditContact(contact); }} className="px-2.5 py-1 text-xs text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A] rounded">Edit</button>
                      <button onClick={e => { e.preventDefault(); deleteContact(contact.id); }} className="px-2.5 py-1 text-xs text-[#A0A0A0] hover:text-red-400 hover:bg-[#2A2A2A] rounded">Delete</button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {tab === 'people' && view === 'pipeline' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage, ci) => {
            const sc = filteredContacts.filter(c => c.pipelineStage === stage.id);
            return (
              <motion.div key={stage.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.04 }} className="flex-shrink-0 w-[240px]">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                  <span className="text-xs font-semibold text-white">{stage.name}</span>
                  <span className="text-xs text-[#A0A0A0] bg-[#2A2A2A] px-1.5 py-0.5 rounded-full">{sc.length}</span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {sc.map(c => (
                    <Link key={c.id} href={`/crm/${c.id}`}>
                      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 hover:border-[#3A3A3A] transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${accentColor}20`, color: accentColor }}>{c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                          <span className="text-sm font-medium text-white truncate">{c.name}</span>
                        </div>
                        {(getOrgName(c.organisationId) || c.company) && <p className="text-xs text-[#A0A0A0]">{getOrgName(c.organisationId) || c.company}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ===== ORGANISATIONS TAB ===== */}
      {tab === 'organisations' && (
        <div className="space-y-2">
          {filteredOrgs.length === 0 ? (
            <div className="text-center py-12"><p className="text-sm text-[#A0A0A0]">No organisations found</p><button onClick={openCreateOrg} className="mt-3 text-xs font-medium" style={{ color: accentColor }}>+ Add your first organisation</button></div>
          ) : filteredOrgs.map((org, i) => {
            const orgContacts = allContacts.filter(c => c.organisationId === org.id);
            return (
              <motion.div key={org.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: i * 0.03 }}>
                <div className="flex items-center gap-4 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-[#3A3A3A] transition-colors group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0" style={{ background: `${accentColor}15`, color: accentColor }}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{org.name}</span>
                      {org.industry && <span className="text-xs text-[#6B7280] bg-[#2A2A2A] px-2 py-0.5 rounded-full">{org.industry}</span>}
                    </div>
                    <div className="text-xs text-[#A0A0A0] mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{orgContacts.length} {orgContacts.length === 1 ? 'contact' : 'contacts'}</span>
                      {org.website && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{org.website.replace(/^https?:\/\//, '')}</span>}
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-4 shrink-0">
                    {org.email && <span className="flex items-center gap-1 text-xs text-[#A0A0A0]"><Mail className="w-3.5 h-3.5" />{org.email}</span>}
                    {org.phone && <span className="flex items-center gap-1 text-xs text-[#A0A0A0]"><Phone className="w-3.5 h-3.5" />{org.phone}</span>}
                  </div>
                  {orgContacts.length > 0 && (
                    <div className="hidden lg:flex -space-x-2">
                      {orgContacts.slice(0, 3).map(c => (
                        <div key={c.id} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-[#1A1A1A]" style={{ background: `${accentColor}20`, color: accentColor }}>
                          {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                      ))}
                      {orgContacts.length > 3 && <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold bg-[#2A2A2A] text-[#A0A0A0] border-2 border-[#1A1A1A]">+{orgContacts.length - 3}</div>}
                    </div>
                  )}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditOrg(org)} className="px-2.5 py-1 text-xs text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A] rounded">Edit</button>
                    <button onClick={() => deleteOrganisation(org.id)} className="px-2.5 py-1 text-xs text-[#A0A0A0] hover:text-red-400 hover:bg-[#2A2A2A] rounded">Delete</button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Contact Dialog */}
      <ContactDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingContact(undefined); }}
        onSave={handleSaveContact}
        workspaceId={workspace.id}
        initialContact={editingContact}
        stages={stages}
        accentColor={accentColor}
      />

      {/* Organisation Dialog */}
      {orgDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOrgDialogOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold text-white mb-4">{editingOrg ? 'Edit Organisation' : 'New Organisation'}</h2>
            <div className="space-y-3">
              <input value={orgForm.name} onChange={e => setOrgForm(p => ({ ...p, name: e.target.value }))} placeholder="Organisation name *" className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A]" />
              <input value={orgForm.industry} onChange={e => setOrgForm(p => ({ ...p, industry: e.target.value }))} placeholder="Industry" className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A]" />
              <div className="grid grid-cols-2 gap-3">
                <input value={orgForm.email} onChange={e => setOrgForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A]" />
                <input value={orgForm.phone} onChange={e => setOrgForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A]" />
              </div>
              <input value={orgForm.website} onChange={e => setOrgForm(p => ({ ...p, website: e.target.value }))} placeholder="Website" className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A]" />
              <input value={orgForm.address} onChange={e => setOrgForm(p => ({ ...p, address: e.target.value }))} placeholder="Address" className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A]" />
              <textarea value={orgForm.notes} onChange={e => setOrgForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes" rows={3} className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A] resize-none" />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setOrgDialogOpen(false)} className="px-4 py-2 text-sm text-[#A0A0A0] hover:text-white rounded-lg hover:bg-[#2A2A2A]">Cancel</button>
              <button onClick={handleSaveOrg} disabled={!orgForm.name.trim()} className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-40" style={{ background: accentColor, color: '#0F0F0F' }}>{editingOrg ? 'Save' : 'Create'}</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
