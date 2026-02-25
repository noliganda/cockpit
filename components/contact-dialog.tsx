'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Contact } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface ContactDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (contact: Omit<Contact, 'id'>) => void;
  workspaceId: string;
  initialContact?: Contact;
  stages: { id: string; name: string }[];
  accentColor?: string;
}

const INP = 'w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3A3A3A] transition-colors';
const SEL = 'w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3A3A3A] transition-colors appearance-none';
const LBL = 'block text-xs font-medium text-[#A0A0A0] mb-1.5';

export function ContactDialog({
  open,
  onClose,
  onSave,
  workspaceId,
  initialContact,
  stages,
  accentColor = '#D4A017',
}: ContactDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [pipelineStage, setPipelineStage] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (initialContact) {
      setName(initialContact.name);
      setEmail(initialContact.email ?? '');
      setPhone(initialContact.phone ?? '');
      setCompany(initialContact.company ?? '');
      setRole(initialContact.role ?? '');
      setAddress(initialContact.address ?? '');
      setWebsite(initialContact.website ?? '');
      setPipelineStage(initialContact.pipelineStage ?? '');
      setNotes(initialContact.notes ?? '');
      setTagsInput(initialContact.tags.join(', '));
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setRole('');
      setAddress('');
      setWebsite('');
      setPipelineStage(stages[0]?.id ?? '');
      setNotes('');
      setTagsInput('');
    }
  }, [initialContact, open, stages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    onSave({
      workspaceId,
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      company: company.trim() || undefined,
      role: role.trim() || undefined,
      address: address.trim() || undefined,
      website: website.trim() || undefined,
      pipelineStage: pipelineStage || undefined,
      notes: notes.trim() || undefined,
      tags,
      lastContact: new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A] sticky top-0 bg-[#1A1A1A] z-10">
              <h2 className="text-base font-semibold text-white">
                {initialContact ? 'Edit Contact' : 'New Contact'}
              </h2>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#2A2A2A] transition-colors"
              >
                <X className="w-4 h-4 text-[#A0A0A0]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className={LBL}>Name *</label>
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  className={INP}
                  required
                />
              </div>

              {/* Two-column grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <label className={LBL}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className={INP}
                  />
                </div>
                <div>
                  <label className={LBL}>Phone</label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 555 000 0000"
                    className={INP}
                  />
                </div>
                <div>
                  <label className={LBL}>Company</label>
                  <input
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    placeholder="Company name"
                    className={INP}
                  />
                </div>
                <div>
                  <label className={LBL}>Role</label>
                  <input
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    placeholder="Job title"
                    className={INP}
                  />
                </div>
                <div>
                  <label className={LBL}>Website</label>
                  <input
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className={INP}
                  />
                </div>
                <div>
                  <label className={LBL}>Pipeline Stage</label>
                  <select value={pipelineStage} onChange={e => setPipelineStage(e.target.value)} className={SEL}>
                    <option value="">No stage</option>
                    {stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className={LBL}>Address</label>
                <input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Street, City, State"
                  className={INP}
                />
              </div>

              {/* Notes */}
              <div>
                <label className={LBL}>Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any notes about this contact..."
                  rows={2}
                  className={`${INP} resize-none`}
                />
              </div>

              {/* Tags */}
              <div>
                <label className={LBL}>
                  Tags <span className="text-[#6B7280] font-normal">(comma-separated)</span>
                </label>
                <input
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  placeholder="enterprise, priority, client"
                  className={INP}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{ background: accentColor, color: '#0F0F0F' }}
                >
                  {initialContact ? 'Save Changes' : 'Add Contact'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
