'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { WORKSPACES, PIPELINE_STAGES } from '@/types';
import type { Contact, Organisation } from '@/types';
import { formatDate } from '@/lib/utils';
import {
  Plus, Search, User, Building2, Kanban, Mail, Phone, Globe,
  ExternalLink, Trash2, X,
} from 'lucide-react';
import Link from 'next/link';

type ContactFormData = {
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  website: string;
  notes: string;
  pipelineStage: string;
  workspaceId: string;
  tags: string;
};

type OrgFormData = {
  name: string;
  industry: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  notes: string;
  pipelineStage: string;
  workspaceId: string;
  tags: string;
};

const BLANK_CONTACT: ContactFormData = {
  name: '', email: '', phone: '', company: '', role: '', website: '',
  notes: '', pipelineStage: '', workspaceId: 'korus', tags: '',
};

const BLANK_ORG: OrgFormData = {
  name: '', industry: '', email: '', phone: '', website: '', address: '',
  notes: '', pipelineStage: '', workspaceId: 'korus', tags: '',
};

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterWs, setFilterWs] = useState('all');
  const [activeTab, setActiveTab] = useState('contacts');

  // Contact dialog
  const [contactDialog, setContactDialog] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormData>(BLANK_CONTACT);
  const [savingContact, setSavingContact] = useState(false);

  // Org dialog
  const [orgDialog, setOrgDialog] = useState(false);
  const [editOrg, setEditOrg] = useState<Organisation | null>(null);
  const [orgForm, setOrgForm] = useState<OrgFormData>(BLANK_ORG);
  const [savingOrg, setSavingOrg] = useState(false);

  // Pipeline workspace filter
  const [pipelineWs, setPipelineWs] = useState('korus');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [cr, or_] = await Promise.all([
      fetch('/api/contacts').then((r) => r.json()),
      fetch('/api/organisations').then((r) => r.json()),
    ]);
    if (cr.data) setContacts(cr.data);
    if (or_.data) setOrgs(or_.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredContacts = contacts.filter((c) => {
    if (filterWs !== 'all' && c.workspaceId !== filterWs) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !(c.email ?? '').toLowerCase().includes(search.toLowerCase()) &&
        !(c.company ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredOrgs = orgs.filter((o) => {
    if (filterWs !== 'all' && o.workspaceId !== filterWs) return false;
    if (search && !o.name.toLowerCase().includes(search.toLowerCase()) &&
        !(o.industry ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Pipeline contacts for selected workspace
  const pipelineContacts = contacts.filter((c) => c.workspaceId === pipelineWs);
  const stages = PIPELINE_STAGES[pipelineWs] ?? [];

  function openNewContact() {
    setEditContact(null);
    setContactForm({ ...BLANK_CONTACT, workspaceId: filterWs !== 'all' ? filterWs : 'korus' });
    setContactDialog(true);
  }

  function openEditContact(c: Contact) {
    setEditContact(c);
    setContactForm({
      name: c.name,
      email: c.email ?? '',
      phone: c.phone ?? '',
      company: c.company ?? '',
      role: c.role ?? '',
      website: c.website ?? '',
      notes: c.notes ?? '',
      pipelineStage: c.pipelineStage ?? '',
      workspaceId: c.workspaceId,
      tags: (c.tags ?? []).join(', '),
    });
    setContactDialog(true);
  }

  async function saveContact() {
    setSavingContact(true);
    const body = {
      ...contactForm,
      tags: contactForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      email: contactForm.email || undefined,
      pipelineStage: contactForm.pipelineStage || undefined,
    };
    const url = editContact ? `/api/contacts/${editContact.id}` : '/api/contacts';
    const method = editContact ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.data) {
      if (editContact) {
        setContacts((prev) => prev.map((c) => c.id === data.data.id ? data.data : c));
      } else {
        setContacts((prev) => [data.data, ...prev]);
      }
      setContactDialog(false);
    }
    setSavingContact(false);
  }

  async function deleteContact(id: string) {
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setContactDialog(false);
  }

  function openNewOrg() {
    setEditOrg(null);
    setOrgForm({ ...BLANK_ORG, workspaceId: filterWs !== 'all' ? filterWs : 'korus' });
    setOrgDialog(true);
  }

  function openEditOrg(o: Organisation) {
    setEditOrg(o);
    setOrgForm({
      name: o.name,
      industry: o.industry ?? '',
      email: o.email ?? '',
      phone: o.phone ?? '',
      website: o.website ?? '',
      address: o.address ?? '',
      notes: o.notes ?? '',
      pipelineStage: o.pipelineStage ?? '',
      workspaceId: o.workspaceId,
      tags: (o.tags ?? []).join(', '),
    });
    setOrgDialog(true);
  }

  async function saveOrg() {
    setSavingOrg(true);
    const body = {
      ...orgForm,
      tags: orgForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      pipelineStage: orgForm.pipelineStage || undefined,
    };
    const url = editOrg ? `/api/organisations/${editOrg.id}` : '/api/organisations';
    const method = editOrg ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.data) {
      if (editOrg) {
        setOrgs((prev) => prev.map((o) => o.id === data.data.id ? data.data : o));
      } else {
        setOrgs((prev) => [data.data, ...prev]);
      }
      setOrgDialog(false);
    }
    setSavingOrg(false);
  }

  async function deleteOrg(id: string) {
    await fetch(`/api/organisations/${id}`, { method: 'DELETE' });
    setOrgs((prev) => prev.filter((o) => o.id !== id));
    setOrgDialog(false);
  }

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;
    await fetch(`/api/contacts/${draggableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipelineStage: newStage }),
    });
    setContacts((prev) =>
      prev.map((c) => c.id === draggableId ? { ...c, pipelineStage: newStage } : c)
    );
  }

  const wsColor = (id: string) => WORKSPACES.find((w) => w.id === id)?.color ?? '#6B7280';
  const wsIcon = (id: string) => WORKSPACES.find((w) => w.id === id)?.icon ?? '';

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between flex-wrap gap-2"
      >
        <div>
          <h1 className="text-2xl font-semibold text-white">CRM</h1>
          <p className="text-sm text-[#A0A0A0] mt-0.5">
            {contacts.length} contacts · {orgs.length} organisations
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'contacts' && (
            <Button size="sm" onClick={openNewContact}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Contact
            </Button>
          )}
          {activeTab === 'organisations' && (
            <Button size="sm" onClick={openNewOrg}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Organisation
            </Button>
          )}
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7280]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={filterWs} onValueChange={setFilterWs}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Workspace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Workspaces</SelectItem>
            {WORKSPACES.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.icon} {w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1A1A1A] border border-[#2A2A2A]">
          <TabsTrigger value="contacts">
            <User className="h-3.5 w-3.5 mr-1.5" />
            Contacts ({filteredContacts.length})
          </TabsTrigger>
          <TabsTrigger value="organisations">
            <Building2 className="h-3.5 w-3.5 mr-1.5" />
            Organisations ({filteredOrgs.length})
          </TabsTrigger>
          <TabsTrigger value="pipeline">
            <Kanban className="h-3.5 w-3.5 mr-1.5" />
            Pipeline
          </TabsTrigger>
        </TabsList>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="mt-4">
          {loading ? (
            <div className="p-8 text-center text-sm text-[#6B7280]">Loading...</div>
          ) : filteredContacts.length === 0 ? (
            <Card className="p-8 text-center">
              <User className="h-8 w-8 text-[#6B7280] mx-auto mb-2" />
              <p className="text-sm text-[#6B7280]">No contacts yet.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={openNewContact}>
                Add first contact
              </Button>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2A2A2A] text-xs text-[#6B7280]">
                      <th className="px-4 py-2.5 text-left font-medium">Name</th>
                      <th className="px-4 py-2.5 text-left font-medium hidden sm:table-cell">Email</th>
                      <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">Company</th>
                      <th className="px-4 py-2.5 text-left font-medium hidden lg:table-cell">Stage</th>
                      <th className="px-4 py-2.5 text-left font-medium hidden lg:table-cell">Workspace</th>
                      <th className="px-4 py-2.5 text-left font-medium hidden xl:table-cell">Added</th>
                    </tr>
                  </thead>
                  <motion.tbody
                    initial="hidden"
                    animate="show"
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
                  >
                    {filteredContacts.map((contact) => (
                      <motion.tr
                        key={contact.id}
                        variants={{ hidden: { opacity: 0, x: -4 }, show: { opacity: 1, x: 0, transition: { duration: 0.2 } } }}
                        className="border-b border-[#2A2A2A] hover:bg-[#222222] cursor-pointer transition-colors last:border-b-0"
                      >
                        <td className="px-4 py-3" onClick={() => openEditContact(contact)}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                              style={{ backgroundColor: wsColor(contact.workspaceId) + '33', color: wsColor(contact.workspaceId) }}
                            >
                              {contact.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm text-white">{contact.name}</p>
                              {contact.role && <p className="text-xs text-[#6B7280]">{contact.role}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell" onClick={() => openEditContact(contact)}>
                          {contact.email ? (
                            <span className="text-xs text-[#A0A0A0]">{contact.email}</span>
                          ) : <span className="text-xs text-[#6B7280]">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell" onClick={() => openEditContact(contact)}>
                          <span className="text-xs text-[#A0A0A0]">{contact.company ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell" onClick={() => openEditContact(contact)}>
                          {contact.pipelineStage ? (
                            <Badge className="text-[10px]">{contact.pipelineStage}</Badge>
                          ) : <span className="text-xs text-[#6B7280]">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell" onClick={() => openEditContact(contact)}>
                          <span className="text-xs" style={{ color: wsColor(contact.workspaceId) }}>
                            {wsIcon(contact.workspaceId)} {WORKSPACES.find((w) => w.id === contact.workspaceId)?.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell" onClick={() => openEditContact(contact)}>
                          <span className="text-xs text-[#6B7280]">{formatDate(contact.createdAt)}</span>
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Organisations Tab */}
        <TabsContent value="organisations" className="mt-4">
          {loading ? (
            <div className="p-8 text-center text-sm text-[#6B7280]">Loading...</div>
          ) : filteredOrgs.length === 0 ? (
            <Card className="p-8 text-center">
              <Building2 className="h-8 w-8 text-[#6B7280] mx-auto mb-2" />
              <p className="text-sm text-[#6B7280]">No organisations yet.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={openNewOrg}>
                Add first organisation
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrgs.map((org, i) => (
                <motion.div
                  key={org.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                >
                  <Card
                    className="p-4 cursor-pointer hover:border-[#3A3A3A] transition-colors"
                    onClick={() => openEditOrg(org)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-medium shrink-0"
                          style={{ backgroundColor: wsColor(org.workspaceId) + '33', color: wsColor(org.workspaceId) }}
                        >
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{org.name}</p>
                          {org.industry && <p className="text-xs text-[#6B7280]">{org.industry}</p>}
                        </div>
                      </div>
                      {org.pipelineStage && (
                        <Badge className="text-[10px] shrink-0">{org.pipelineStage}</Badge>
                      )}
                    </div>
                    <div className="mt-3 space-y-1">
                      {org.email && (
                        <div className="flex items-center gap-1.5 text-xs text-[#A0A0A0]">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{org.email}</span>
                        </div>
                      )}
                      {org.website && (
                        <div className="flex items-center gap-1.5 text-xs text-[#A0A0A0]">
                          <Globe className="h-3 w-3" />
                          <span className="truncate">{org.website}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs" style={{ color: wsColor(org.workspaceId) }}>
                        {wsIcon(org.workspaceId)} {WORKSPACES.find((w) => w.id === org.workspaceId)?.name}
                      </span>
                      <Link
                        href={`/crm/${org.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-[#6B7280] hover:text-white flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-[#A0A0A0]">Workspace:</span>
            <div className="flex gap-2">
              {WORKSPACES.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setPipelineWs(w.id)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={
                    pipelineWs === w.id
                      ? { backgroundColor: w.color, color: '#000' }
                      : { backgroundColor: '#1A1A1A', color: '#A0A0A0', border: '1px solid #2A2A2A' }
                  }
                >
                  {w.icon} {w.name}
                </button>
              ))}
            </div>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {stages.map((stage) => {
                const stageContacts = pipelineContacts.filter((c) => c.pipelineStage === stage);
                const ws = WORKSPACES.find((w) => w.id === pipelineWs)!;
                return (
                  <div key={stage} className="flex-shrink-0 w-64">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wide">{stage}</span>
                      <span
                        className="text-xs rounded-full px-1.5 py-0.5 font-medium"
                        style={{ backgroundColor: ws.color + '22', color: ws.color }}
                      >
                        {stageContacts.length}
                      </span>
                    </div>
                    <Droppable droppableId={stage}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="min-h-24 rounded-xl p-2 space-y-2 transition-colors"
                          style={{ backgroundColor: snapshot.isDraggingOver ? '#222222' : '#1A1A1A', border: '1px solid #2A2A2A' }}
                        >
                          {stageContacts.map((contact, idx) => (
                            <Draggable key={contact.id} draggableId={contact.id} index={idx}>
                              {(prov, snap) => (
                                <div
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  {...prov.dragHandleProps}
                                  className="rounded-lg p-3 cursor-grab"
                                  style={{
                                    backgroundColor: snap.isDragging ? '#2A2A2A' : '#0F0F0F',
                                    border: '1px solid #2A2A2A',
                                    ...prov.draggableProps.style,
                                  }}
                                  onClick={() => openEditContact(contact)}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                                      style={{ backgroundColor: ws.color + '33', color: ws.color }}
                                    >
                                      {contact.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-white truncate">{contact.name}</p>
                                      {contact.company && (
                                        <p className="text-[10px] text-[#6B7280] truncate">{contact.company}</p>
                                      )}
                                    </div>
                                  </div>
                                  {contact.email && (
                                    <div className="flex items-center gap-1 mt-1.5">
                                      <Mail className="h-3 w-3 text-[#6B7280]" />
                                      <span className="text-[10px] text-[#6B7280] truncate">{contact.email}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {stageContacts.length === 0 && (
                            <p className="text-[10px] text-[#6B7280] text-center py-4">Drop here</p>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        </TabsContent>
      </Tabs>

      {/* Contact Dialog */}
      <Dialog open={contactDialog} onOpenChange={setContactDialog}>
        <DialogContent className="max-w-lg bg-[#1A1A1A] border-[#2A2A2A]">
          <DialogHeader>
            <DialogTitle>{editContact ? 'Edit Contact' : 'New Contact'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Name *</Label>
                <Input value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company</Label>
                <Input value={contactForm.company} onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Role</Label>
                <Input value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Website</Label>
                <Input value={contactForm.website} onChange={(e) => setContactForm({ ...contactForm, website: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Workspace</Label>
                <Select value={contactForm.workspaceId} onValueChange={(v) => setContactForm({ ...contactForm, workspaceId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WORKSPACES.map((w) => <SelectItem key={w.id} value={w.id}>{w.icon} {w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pipeline Stage</Label>
                <Select value={contactForm.pipelineStage} onValueChange={(v) => setContactForm({ ...contactForm, pipelineStage: v })}>
                  <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                  <SelectContent>
                    {(PIPELINE_STAGES[contactForm.workspaceId] ?? []).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Tags (comma-separated)</Label>
                <Input value={contactForm.tags} onChange={(e) => setContactForm({ ...contactForm, tags: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Notes</Label>
                <textarea
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-transparent px-3 py-2 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A] resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              {editContact && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => deleteContact(editContact.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={() => setContactDialog(false)}>
                  <X className="h-4 w-4 mr-1.5" />Cancel
                </Button>
                <Button size="sm" onClick={saveContact} disabled={savingContact || !contactForm.name}>
                  {savingContact ? 'Saving…' : editContact ? 'Save' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Organisation Dialog */}
      <Dialog open={orgDialog} onOpenChange={setOrgDialog}>
        <DialogContent className="max-w-lg bg-[#1A1A1A] border-[#2A2A2A]">
          <DialogHeader>
            <DialogTitle>{editOrg ? 'Edit Organisation' : 'New Organisation'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Name *</Label>
                <Input value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Industry</Label>
                <Input value={orgForm.industry} onChange={(e) => setOrgForm({ ...orgForm, industry: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={orgForm.email} onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input value={orgForm.phone} onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Website</Label>
                <Input value={orgForm.website} onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Address</Label>
                <Input value={orgForm.address} onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Workspace</Label>
                <Select value={orgForm.workspaceId} onValueChange={(v) => setOrgForm({ ...orgForm, workspaceId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WORKSPACES.map((w) => <SelectItem key={w.id} value={w.id}>{w.icon} {w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pipeline Stage</Label>
                <Select value={orgForm.pipelineStage} onValueChange={(v) => setOrgForm({ ...orgForm, pipelineStage: v })}>
                  <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                  <SelectContent>
                    {(PIPELINE_STAGES[orgForm.workspaceId] ?? []).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Notes</Label>
                <textarea
                  value={orgForm.notes}
                  onChange={(e) => setOrgForm({ ...orgForm, notes: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-transparent px-3 py-2 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A] resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              {editOrg && (
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => deleteOrg(editOrg.id)}>
                  <Trash2 className="h-4 w-4 mr-1.5" />Delete
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={() => setOrgDialog(false)}>
                  <X className="h-4 w-4 mr-1.5" />Cancel
                </Button>
                <Button size="sm" onClick={saveOrg} disabled={savingOrg || !orgForm.name}>
                  {savingOrg ? 'Saving…' : editOrg ? 'Save' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
