import { db, auth } from './config';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
import type { EmergencyContact } from '../definitions';
import { adminDb } from './admin';

// Function to get the current user's ID on the client
const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No authenticated user found.");
  }
  return user.uid;
};

// Add a new emergency contact for the current user (CLIENT-SIDE)
export const addContact = async (contact: { name: string; phone: string }) => {
  const userId = getCurrentUserId();
  await addDoc(collection(db, 'users', userId, 'contacts'), contact);
};

// Get all emergency contacts for a given user ID
// This function can be called from the client or server
export const getUserContacts = async (userId: string): Promise<EmergencyContact[]> => {
  // Determine if we are on the server or client
  const isServer = typeof window === 'undefined';
  
  if (isServer) {
    // SERVER-SIDE LOGIC (using Admin SDK)
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

  } else {
    // CLIENT-SIDE LOGIC (using Client SDK)
    const contactsRef = collection(db, 'users', userId, 'contacts');
    const q = query(contactsRef);
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
    }
    const contacts: EmergencyContact[] = [];
    snapshot.forEach(doc => {
      contacts.push({ id: doc.id, ...doc.data() } as EmergencyContact);
    });
    return contacts;
  }
};

// This version is specifically for client-side use where auth.currentUser is available
export const getClientUserContacts = async (): Promise<EmergencyContact[]> => {
    const userId = getCurrentUserId();
    return getUserContacts(userId);
}

// Delete an emergency contact (CLIENT-SIDE)
export const deleteContact = async (contactId: string) => {
    const userId = getCurrentUserId();
    await deleteDoc(doc(db, 'users', userId, 'contacts', contactId));
};
