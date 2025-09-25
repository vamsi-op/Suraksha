import { db, auth } from './config';
import { collection, addDoc, getDocs, query, doc, deleteDoc, GeoPoint, Timestamp } from 'firebase/firestore';
import type { EmergencyContact } from '../definitions';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';

// This file should only contain CLIENT-SIDE Firestore operations.

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

// Get all emergency contacts for the current logged-in user (CLIENT-SIDE)
export const getClientUserContacts = async (): Promise<EmergencyContact[]> => {
    const userId = getCurrentUserId();
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

// Delete an emergency contact (CLIENT-SIDE)
export const deleteContact = async (contactId: string) => {
    const userId = getCurrentUserId();
    await deleteDoc(doc(db, 'users', userId, 'contacts', contactId));
};

// Add a new activity report (CLIENT-SIDE)
export const addActivityReport = (report: {
    location: { latitude: number; longitude: number };
    comment: string;
    userId: string;
    timestamp: Timestamp;
}) => {
    const reportData = {
        ...report,
        location: new GeoPoint(report.location.latitude, report.location.longitude),
    };

    const collectionRef = collection(db, 'activity-reports');

    addDoc(collectionRef, reportData)
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: collectionRef.path,
          operation: 'create',
          requestResourceData: reportData,
        });

        errorEmitter.emit('permission-error', permissionError);
      });
};
