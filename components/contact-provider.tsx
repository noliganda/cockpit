'use client';

import { useState, useCallback, ReactNode } from 'react';
import { Contact } from '@/types';
import { MOCK_CONTACTS } from '@/lib/data';
import { ContactContext } from '@/stores/contact-store';

let nextId = MOCK_CONTACTS.length + 1;

export function ContactProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);

  const getContactsForWorkspace = useCallback((workspaceId: string) => {
    return contacts.filter(c => c.workspaceId === workspaceId);
  }, [contacts]);

  const getContactById = useCallback((id: string) => {
    return contacts.find(c => c.id === id);
  }, [contacts]);

  const addContact = useCallback((contact: Omit<Contact, 'id'>): Contact => {
    const newContact: Contact = {
      ...contact,
      id: `contact-${nextId++}`,
    };
    setContacts(prev => [...prev, newContact]);
    return newContact;
  }, []);

  const updateContact = useCallback((id: string, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(c =>
      c.id === id ? { ...c, ...updates } : c
    ));
  }, []);

  const deleteContact = useCallback((id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  }, []);

  return (
    <ContactContext.Provider value={{ contacts, getContactsForWorkspace, getContactById, addContact, updateContact, deleteContact }}>
      {children}
    </ContactContext.Provider>
  );
}
