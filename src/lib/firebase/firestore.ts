import { db, auth } from './config';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
import type { EmergencyContact } from '../definitions';

// Function to get the current user's ID on the client
const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No authenticated user found.");
  }
  return user.uid;
};

// Add a new emergency contact for the current user
export const addContact = async (contact: { name: string; phone: string }) => {
  const userId = getCurrentUserId();
  await addDoc(collection(db, 'users', userId, 'contacts'), contact);
};

// Get all emergency contacts for a given user ID
export const getUserContacts = async (userId?: string): Promise<EmergencyContact[]> => {
  const uid = userId || getCurrentUserId();
  const q = query(collection(db, 'users', uid, 'contacts'));
  const querySnapshot = await getDocs(q);
  const contacts: EmergencyContact[] = [];
  querySnapshot.forEach((doc) => {
    contacts.push({ id: doc.id, ...doc.data() } as EmergencyContact);
  });
  return contacts;
};

// Delete an emergency contact
export const deleteContact = async (contactId: string) => {
    const userId = getCurrentUserId();
    await deleteDoc(doc(db, 'users', userId, 'contacts', contactId));
};
