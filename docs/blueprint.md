# **App Name**: Guardian Angel

## Core Features:

- Interactive Map: Display a map using Google Maps JavaScript API with hardcoded danger zones as a heatmap, visualizing the zones with color gradients (green -> yellow -> red). Also show the user’s live location.
- Safe Route Visualization: Calculate and display a route to a destination entered by the user.  Suggest and display a safer alternative route ('safe corridor') if the original route passes through danger zones.
- SOS Trigger: Activate an emergency function when a 'Help Me' button is pressed; capture the user’s current location, record a short audio/video (mocked), and call a Firebase Function stub to simulate sending an emergency SMS.
- Danger Zone Proximity Alerts: Trigger in-browser notifications when the user enters a predefined radius around a danger zone.
- Location Sharing Simulation: Offer a 'Track Me' feature to simulate location sharing for a defined period.

## Style Guidelines:

- Primary color: Strong Blue (#3282B8) to create a feeling of trust.
- Background color: Light Blue (#D1E5F2) creates an airy backdrop.
- Accent color: Muted Purple (#8764B8) adds contrast and modernity.
- Body and headline font: 'Inter', a sans-serif with a modern, machined, objective, neutral look, suitable for headlines or body text
- Use clear and direct icons for navigation and features, prioritizing simple shapes and high contrast.
- Employ a card-based layout to present information clearly, making use of white space to keep the design open and easily navigable.
- Use subtle transitions for map updates and alerts to provide a smooth and informative user experience.