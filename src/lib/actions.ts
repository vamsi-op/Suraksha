'use server';

export async function triggerSOS(location: { lat: number; lng: number }) {
  console.log('--- SOS TRIGGERED ---');
  console.log(`Emergency at location: https://www.google.com/maps?q=${location.lat},${location.lng}`);
  console.log('Simulating sending SMS to emergency contacts...');
  // In a real application, you would integrate with an SMS service like Twilio here.
  return { success: true, message: 'SOS signal sent.' };
}
