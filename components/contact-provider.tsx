'use client';

import { useCallback, ReactNode } from 'react';
import { Contact } from '@/types';
import { ContactContext } from '@/stores/contact-store';
import { useLocalStorage } from '@/hooks/use-local-storage';

export function ContactProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useLocalStorage<Contact[]>('ops_contacts', []);

  const getContactsForWorkspace = useCallback((workspaceId: string) => {
    return contacts.filter(c => c.workspaceId === workspaceId);
  }, [contacts]);

  const getContactById = useCallback((id: string) => {
    return contacts.find(c => c.id === id);
  }, [contacts]);

  const addContact = useCallback((contact: Omit<Contact, 'id'>): Contact => {
    const newContact: Contact = {
      ...contact,
      id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    setContacts(prev => [...prev, newContact]);
    return newContact;
  }, [setContacts]);

  const updateContact = useCallback((id: string, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, [setContacts]);

  const deleteContact = useCallback((id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  }, [setContacts]);

  return (
    <ContactContext.Provider value={{ contacts, getContactsForWorkspace, getContactById, addContact, updateContact, deleteContact }}>
      {children}
    </ContactContext.Provider>
  );
}
