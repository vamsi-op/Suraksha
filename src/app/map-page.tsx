'use client';

import { useState, useEffect, useRef } from 'react';
import type { DangerZone, LatLngExpression } from '@/lib/definitions';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { triggerSOS } from '@/lib/actions';

import GuardianAngelMap from '@/components/guardian-angel-map';
import ControlPanel from '@/components/control-panel';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { getDistance } from '@/lib/utils';

const DANGER_ZONES: DangerZone[] = [
  { id: 'zone1', location: [34.052235, -118.243683], weight: 50, radius: 1000 },
  { id: 'zone2', location: [34.02235, -118.285118], weight: 80, radius: 1500 },
  { id: 'zone3', location: [33.941589, -118.408531], weight: 30, radius: 1200 },
  { id: 'zone4', location: [34.0736, -118.399], weight: 65, radius: 800 },
];

const PROXIMITY_THRESHOLD_METERS = 500;
const LOS_ANGELES: LatLngExpression = [34.0549, -118.2426];

export default function MapPage() {
  const [userPosition, setUserPosition] = useState<LatLngExpression | null>(null);
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
        console.warn('Geolocation permission denied. Defaulting to Los Angeles.');
        setUserPosition(LOS_ANGELES);
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
          title: '⚠️ Danger Zone Alert',
          description: `You are approaching a high-risk area. Please be cautious.`,
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

  const controlPanelProps = {
    handleSos,
    isTracking,
    trackingSeconds,
    handleToggleTracking,
  };

  return (
    <div className="relative h-screen w-screen">
      <GuardianAngelMap
        userPosition={userPosition}
        dangerZones={DANGER_ZONES}
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
