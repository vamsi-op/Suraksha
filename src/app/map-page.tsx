'use client';

import { APIProvider } from '@vis.gl/react-google-maps';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { DangerZone } from '@/lib/definitions';
import { GOOGLE_MAPS_API_KEY } from '@/lib/env';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { triggerSOS } from '@/lib/actions';

import GuardianAngelMap from '@/components/guardian-angel-map';
import ControlPanel from '@/components/control-panel';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';

const DANGER_ZONES: DangerZone[] = [
  { id: 'zone1', location: { lat: 34.052235, lng: -118.243683 }, weight: 50, radius: 1000 },
  { id: 'zone2', location: { lat: 34.02235, lng: -118.285118 }, weight: 80, radius: 1500 },
  { id: 'zone3', location: { lat: 33.941589, lng: -118.408531 }, weight: 30, radius: 1200 },
  { id: 'zone4', location: { lat: 34.0736, lng: -118.399 }, weight: 65, radius: 800 },
];

const PROXIMITY_THRESHOLD_METERS = 500;
const LOS_ANGELES = { lat: 34.0549, lng: -118.2426 };

export default function MapPage() {
  const [userPosition, setUserPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [destination, setDestination] = useState<string>('');
  const [routes, setRoutes] = useState<google.maps.DirectionsRoute[]>([]);
  const [saferRouteIndex, setSaferRouteIndex] = useState<number>(0);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingSeconds, setTrackingSeconds] = useState(1800);
  const alertedZones = useRef<Set<string>>(new Set());
  const isMobile = useIsMobile();
  const { toast } = useToast();

  useEffect(() => {
    navigator.geolocation.watchPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserPosition(pos);
        checkProximity(pos);
      },
      () => {
        console.warn('Geolocation permission denied. Defaulting to Los Angeles.');
        setUserPosition(LOS_ANGELES);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && trackingSeconds > 0) {
      interval = setInterval(() => {
        setTrackingSeconds((prev) => prev - 1);
      }, 1000);
    } else if (trackingSeconds === 0) {
      setIsTracking(false);
      toast({ title: 'Location Sharing Ended', description: 'Your location is no longer being shared.' });
    }
    return () => clearInterval(interval);
  }, [isTracking, trackingSeconds, toast]);

  const checkProximity = (position: google.maps.LatLngLiteral) => {
    if (!window.google) return;
    const userLatLng = new google.maps.LatLng(position.lat, position.lng);
    DANGER_ZONES.forEach((zone) => {
      if (alertedZones.current.has(zone.id)) return;

      const zoneLatLng = new google.maps.LatLng(zone.location.lat, zone.location.lng);
      const distance = google.maps.geometry.spherical.computeDistanceBetween(userLatLng, zoneLatLng);
      
      if (distance < zone.radius + PROXIMITY_THRESHOLD_METERS) {
        toast({
          variant: 'destructive',
          title: '⚠️ Danger Zone Alert',
          description: `You are approaching a high-risk area. Please be cautious.`,
        });
        alertedZones.current.add(zone.id);
      }
    });
  };

  const findRoute = useCallback(async () => {
    if (!userPosition || !destination || !window.google) return;
    
    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: userPosition,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const scoredRoutes = result.routes.map((route) => {
            let score = 0;
            route.overview_path.forEach(point => {
              DANGER_ZONES.forEach(zone => {
                const distance = google.maps.geometry.spherical.computeDistanceBetween(
                  point, 
                  zone.location
                );
                if (distance < zone.radius) {
                  score += zone.weight;
                }
              });
            });
            return { route, score };
          });

          scoredRoutes.sort((a, b) => a.score - b.score);
          const bestRouteIndex = result.routes.indexOf(scoredRoutes[0].route);

          setRoutes(result.routes);
          setSaferRouteIndex(bestRouteIndex);
          toast({
            title: 'Routes Found',
            description: 'The Guardian Route is highlighted in blue as the safer option.',
          });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not find a route to the destination.' });
        }
      }
    );
  }, [userPosition, destination, toast]);

  const handleSos = async () => {
    if (!userPosition) return;
    await triggerSOS(userPosition);
    toast({
      variant: 'destructive',
      title: 'SOS Activated',
      description: 'Your location has been sent to emergency contacts.',
    });
  };

  const handleToggleTracking = () => {
    if(isTracking) {
        setIsTracking(false);
        toast({ title: 'Location Sharing Stopped' });
    } else {
        setTrackingSeconds(1800); // Reset to 30 mins
        setIsTracking(true);
        toast({ title: 'Location Sharing Started', description: 'Your location will be shared for 30 minutes.' });
    }
  }

  const controlPanelProps = {
    destination,
    setDestination,
    findRoute,
    handleSos,
    isTracking,
    trackingSeconds,
    handleToggleTracking,
    routes,
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4 text-center">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Configuration Error</h1>
          <p className="text-foreground">
            Google Maps API key is missing. Please add <code className="bg-muted px-2 py-1 rounded-md">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your <code className="bg-muted px-2 py-1 rounded-md">.env.local</code> file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['core', 'maps', 'marker', 'visualization', 'routes', 'geometry']}>
      <div className="relative h-screen w-screen">
        <GuardianAngelMap
          userPosition={userPosition}
          dangerZones={DANGER_ZONES}
          routes={routes}
          saferRouteIndex={saferRouteIndex}
        />
        {isMobile ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" className="absolute top-4 left-4 z-10 shadow-lg">
                <PanelLeft className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] p-0">
              <ControlPanel {...controlPanelProps} />
            </SheetContent>
          </Sheet>
        ) : (
          <div className="absolute top-0 right-0 h-full w-[400px] z-10 p-4">
            <ControlPanel {...controlPanelProps} />
          </div>
        )}
      </div>
    </APIProvider>
  );
}
