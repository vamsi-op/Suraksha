'use server';

import { getUserContacts } from "./firebase/server-actions";

interface SosResult {
  success: boolean;
  message: string;
}

export async function triggerSOS(userId: string, location: { lat: number; lng: number }): Promise<SosResult> {
  console.log('--- SOS TRIGGERED ---');
  console.log(`User ID: ${userId}`);
  console.log(`Emergency at location: https://www.google.com/maps?q=${location.lat},${location.lng}`);

  try {
    const contacts = await getUserContacts(userId);
    if (contacts.length > 0) {
      console.log('Emergency contacts found:', contacts.map(c => c.name));
      console.log('Simulating sending SMS to emergency contacts...');
      // In a real application, you would integrate with an SMS service like Twilio here.
      // For each contact in contacts, send an SMS with the location link.
      const message = `Alert sent to ${contacts.length} emergency contact${contacts.length > 1 ? 's' : ''}.`;
      return { success: true, message };
    } else {
      console.log('No emergency contacts set for the current user.');
      return { success: false, message: 'No emergency contacts found. Please add contacts in your profile.' };
    }
  } catch (error) {
    console.error('Error fetching contacts for SOS:', error);
    return { success: false, message: 'Could not fetch your emergency contacts.' };
  }
}
