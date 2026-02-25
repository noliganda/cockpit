'use client';

import { createContext, useContext } from 'react';
import { Contact } from '@/types';

export interface ContactStoreValue {
  contacts: Contact[];
  getContactsForWorkspace: (workspaceId: string) => Contact[];
  getContactById: (id: string) => Contact | undefined;
  addContact: (contact: Omit<Contact, 'id'>) => Contact;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
}

export const ContactContext = createContext<ContactStoreValue | null>(null);

export function useContactStore(): ContactStoreValue {
  const ctx = useContext(ContactContext);
  if (!ctx) throw new Error('useContactStore must be used within ContactProvider');
  return ctx;
}
