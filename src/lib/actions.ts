'use server';

import { getUserContacts } from "./firebase/firestore";

export async function triggerSOS(location: { lat: number; lng: number }) {
  console.log('--- SOS TRIGGERED ---');
  console.log(`Emergency at location: https://www.google.com/maps?q=${location.lat},${location.lng}`);

  try {
    const contacts = await getUserContacts();
    if (contacts.length > 0) {
      console.log('Emergency contacts found:', contacts);
      console.log('Simulating sending SMS to emergency contacts...');
      // In a real application, you would integrate with an SMS service like Twilio here.
      // For each contact in contacts, send an SMS.
    } else {
      console.log('No emergency contacts set for the current user.');
    }
  } catch (error) {
    console.error('Error fetching contacts for SOS:', error);
    return { success: false, message: 'Could not fetch emergency contacts.' };
  }
  
  return { success: true, message: 'SOS signal sent.' };
}
