export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
export const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';


if (typeof window !== 'undefined') {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn(
      'Google Maps API key is not set. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file. The map will not work correctly.'
    );
  }
  if (!MAPBOX_ACCESS_TOKEN) {
    console.warn(
        'Mapbox Access Token is not set. Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your .env.local file. Routing will not work correctly.'
    );
  }
}
