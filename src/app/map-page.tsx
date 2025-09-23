'use client';

import { useState, useEffect, useRef } from 'react';
import type { DangerZone, LatLngExpression } from '@/lib/definitions';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { triggerSOS } from '@/lib/actions';

import ControlPanel from '@/components/control-panel';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { getDistance } from '@/lib/utils';
import dynamic from 'next/dynamic';

const GuardianAngelMap = dynamic(() => import('@/components/guardian-angel-map'), { 
  ssr: false,
  loading: () => <div className="h-screen w-screen bg-muted flex items-center justify-center"><p>Loading map...</p></div>
});


const DANGER_ZONES: DangerZone[] = [
  // Visakhapatnam Zones
  { id: 'zone3', location: [17.7126, 83.2982], weight: 90, radius: 400, level: 'high' },  // Jagadamba Centre
  { id: 'zone1', location: [17.7247, 83.3005], weight: 80, radius: 500, level: 'high' }, // RTC Complex area
  { id: 'zone2', location: [17.6750, 83.2010], weight: 70, radius: 800, level: 'moderate' }, // Gajuwaka
  { id: 'zone4', location: [17.7180, 83.3240], weight: 65, radius: 700, level: 'moderate' }, // Beach Road area
  { id: 'zone5', location: [17.7386, 83.3184], weight: 60, radius: 600, level: 'moderate' }, // MVP Colony
  { id: 'zone6', location: [17.7050, 83.2800], weight: 50, radius: 900, level: 'moderate' }, // Old Town / Port Area
  
  // Tagarapuvalasa Zones
  { id: 'zone7', location: [17.9175, 83.4350], weight: 60, radius: 700, level: 'moderate' }, // Tagarapuvalasa Market Area
  { id: 'zone8', location: [17.9100, 83.4400], weight: 55, radius: 800, level: 'moderate' }, // Chittivalasa Jute Mill road
  
  // Vizianagaram Zones
  { id: 'zone9', location: [18.1126, 83.3980], weight: 85, radius: 500, level: 'high' }, // Vizianagaram Railway Station Area
  { id: 'zone10', location: [18.1160, 83.4100], weight: 70, radius: 600, level: 'moderate' }, // Vizianagaram Fort Area
  { id: 'zone11', location: [18.1050, 83.4000], weight: 65, radius: 900, level: 'moderate' }, // Main RTC Complex, Vizianagaram
];

const PROXIMITY_THRESHOLD_METERS = 200;
const VISAKHAPATNAM: LatLngExpression = [17.6868, 83.2185];

export default function MapPage() {
  const [userPosition, setUserPosition] = useState<LatLngExpression | null>(null);
  const [destination, setDestination] = useState<LatLngExpression | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingSeconds, setTrackingSeconds] = useState(1800);
  const alertedZones = useRef<Set<string>>(new Set());
  const isMobile = useIsMobile();
  const { toast } = useToast();

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const pos: LatLngExpression = [position.coords.latitude, position.coords.longitude];
        setUserPosition(pos);
        checkProximity(pos);
      },
      () => {
        console.warn('Geolocation permission denied. Defaulting to Visakhapatnam.');
        setUserPosition(VISAKHAPATNAM);
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
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

  const checkProximity = (position: LatLngExpression) => {
    DANGER_ZONES.forEach((zone) => {
      if (alertedZones.current.has(zone.id)) return;

      const distance = getDistance(position, zone.location);
      
      if (distance < zone.radius + PROXIMITY_THRESHOLD_METERS) {
        toast({
          variant: 'destructive',
          title: `⚠️ ${zone.level === 'high' ? 'High-Risk' : 'Moderate-Risk'} Zone Alert`,
          description: `You are approaching a potentially unsafe area. Please be cautious.`,
        });
        alertedZones.current.add(zone.id);
      }
    });
  };

  const handleSos = async () => {
    if (!userPosition) return;
    const location = { lat: userPosition[0], lng: userPosition[1] };
    await triggerSOS(location);
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

  const handleSetDestination = async (address: string) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        if (lat && lon) {
            const newDestination: LatLngExpression = [parseFloat(lat), parseFloat(lon)];
            setDestination(newDestination);
            toast({ title: 'Destination Set', description: `Route planned to ${display_name}` });
        } else {
            throw new Error('Invalid coordinates received.');
        }
      } else {
        toast({ variant: 'destructive', title: 'Address not found', description: 'Please try a different address.' });
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      toast({ variant: 'destructive', title: 'Routing Error', description: 'Could not set destination. The address might be invalid or the service is unavailable.' });
    }
  };

  const controlPanelProps = {
    handleSos,
    isTracking,
    trackingSeconds,
    handleToggleTracking,
    handleSetDestination,
  };

  return (
    <div className="relative h-screen w-screen">
      <GuardianAngelMap
        userPosition={userPosition}
        dangerZones={DANGER_ZONES}
        destination={destination}
      />
      {isMobile ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" className="absolute top-4 left-4 z-20 shadow-lg">
              <PanelLeft className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[320px] p-0 z-30">
            <ControlPanel {...controlPanelProps} />
          </SheetContent>
        </Sheet>
      ) : (
        <div className="absolute top-0 right-0 h-full w-[400px] z-20 p-4">
          <ControlPanel {...controlPanelProps} />
        </div>
      )}
    </div>
  );
}
