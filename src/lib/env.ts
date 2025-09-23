export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

if (typeof window !== 'undefined' && !GOOGLE_MAPS_API_KEY) {
  console.warn(
    'Google Maps API key is not set. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file. The map will not work correctly.'
  );
}
