'use server';

import { adminDb } from './admin';
import type { EmergencyContact } from '../definitions';

// This file contains SERVER-SIDE Firestore operations using the Admin SDK.

/**
 * Get all emergency contacts for a given user ID.
 * This function MUST be called from a server context (e.g., Server Actions).
 * @param userId The ID of the user whose contacts to fetch.
 * @returns A promise that resolves to an array of emergency contacts.
 */
export const getUserContacts = async (userId: string): Promise<EmergencyContact[]> => {
  const contactsRef = adminDb.collection('users').doc(userId).collection('contacts');
  const snapshot = await contactsRef.get();
  
  if (snapshot.empty) {
    return [];
  }
  
  const contacts: EmergencyContact[] = [];
  snapshot.forEach(doc => {
    contacts.push({ id: doc.id, ...doc.data() } as EmergencyContact);
  });
  
  return contacts;
};
