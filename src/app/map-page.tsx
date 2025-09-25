'use client';

import { useState, useEffect, useRef } from 'react';
import type { DangerZone, LatLngExpression, ActivityReport } from '@/lib/definitions';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/firebase/auth-context';

import ControlPanel from '@/components/control-panel';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PanelLeft, Loader2 } from 'lucide-react';
import { getDistance, isLineSegmentIntersectingCircle } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { AddReportDialog } from '@/components/add-report-dialog';
import { collection, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { addActivityReport } from '@/lib/firebase/firestore';

const GuardianAngelMap = dynamic(() => import('@/components/guardian-angel-map'), { 
  ssr: false,
  loading: () => <div className="h-screen w-screen bg-muted flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
});


const INITIAL_DANGER_ZONES: DangerZone[] = [
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
  const [dangerZones, setDangerZones] = useState<DangerZone[]>(INITIAL_DANGER_ZONES);
  const [activityReports, setActivityReports] = useState<ActivityReport[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newReportLocation, setNewReportLocation] = useState<LatLngExpression | null>(null);

  const alertedZones = useRef<Set<string>>(new Set());
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const hasCenteredMap = useRef(false);

  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const pos: LatLngExpression = [position.coords.latitude, position.coords.longitude];
          setUserPosition(pos);
          if (!hasCenteredMap.current) {
            hasCenteredMap.current = true;
          }
          checkProximity(pos);
        },
        (error) => {
          if (!userPosition) {
            toast({
              variant: 'destructive',
              title: 'Location Error',
              description: 'Could not get your location. Defaulting to Visakhapatnam.',
            });
            setUserPosition(VISAKHAPATNAM);
          }
        },
        { enableHighAccuracy: true }
      );
    }
  
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [toast]);
  
  // Listen for real-time updates to activity reports
  useEffect(() => {
    const q = query(collection(db, 'activity-reports'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const reports: ActivityReport[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reports.push({
          id: doc.id,
          location: [data.location.latitude, data.location.longitude],
          comment: data.comment,
          userId: data.userId,
          timestamp: data.timestamp,
        });
      });
      setActivityReports(reports);
    }, (error) => {
        console.error("Error fetching activity reports: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not fetch community reports.'
        });
    });

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && trackingSeconds > 0) {
      interval = setInterval(() => {
        setTrackingSeconds((prev) => prev - 1);
      }, 1000);
    } else if (isTracking && trackingSeconds === 0) {
      setIsTracking(false);
      toast({ title: 'Location Sharing Ended', description: 'Your location is no longer being shared.' });
    }
    return () => clearInterval(interval);
  }, [isTracking, trackingSeconds, toast]);

  const checkProximity = (position: LatLngExpression) => {
    dangerZones.forEach((zone) => {
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

  const checkRouteAgainstDangerZones = (routeCoords: LatLngExpression[]) => {
    if (routeCoords.length < 2) return;
    
    const intersectingZones = new Set<DangerZone>();

    for (let i = 0; i < routeCoords.length - 1; i++) {
      const segment: [LatLngExpression, LatLngExpression] = [routeCoords[i], routeCoords[i + 1]];
      for (const zone of dangerZones) {
        if (isLineSegmentIntersectingCircle(segment, zone.location, zone.radius)) {
          intersectingZones.add(zone);
        }
      }
    }

    if (intersectingZones.size > 0) {
      const highRiskZones = Array.from(intersectingZones).filter(z => z.level === 'high').length;
      const moderateRiskZones = intersectingZones.size - highRiskZones;
      
      let description = 'Your route passes through ';
      if (highRiskZones > 0) {
        description += `${highRiskZones} high-risk zone${highRiskZones > 1 ? 's' : ''}`;
      }
      if (moderateRiskZones > 0) {
        if (highRiskZones > 0) description += ' and ';
        description += `${moderateRiskZones} moderate-risk zone${moderateRiskZones > 1 ? 's' : ''}`;
      }
      description += '. Please be cautious.';
      
      toast({
        variant: 'destructive',
        title: '⚠️ Route Warning',
        description,
        duration: 9000,
      });
    }
  };

  const handleSetDestination = (address: string) => {
    // This is a placeholder for geocoding
    toast({
        title: 'Feature Under Development',
        description: 'The route search functionality is not yet implemented.',
    });
  };

  const handleSos = async () => {
    toast({
      variant: 'default',
      title: 'SOS Feature (Prototype)',
      description: 'This is a demo. In a real app, your location would be sent to emergency contacts.',
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
  };
  
  const handleOpenReportDialog = () => {
    if (!userPosition) {
      toast({
        variant: 'destructive',
        title: 'Cannot Report',
        description: 'Your location is not available yet. Please wait a moment and try again.'
      });
      return;
    }
    setNewReportLocation(userPosition);
    setDialogOpen(true);
  };

  const handleReportSubmit = (comment: string) => {
    if (!newReportLocation || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not submit report. Location or user not found.' });
        return;
    }

    addActivityReport({
        location: { latitude: newReportLocation[0], longitude: newReportLocation[1] },
        comment,
        userId: user.uid,
        timestamp: Timestamp.now(),
    });

    toast({ title: 'Report Submitted', description: 'Thank you for helping keep the community safe.' });
    setDialogOpen(false);
    setNewReportLocation(null);
  };


  const handleRouteFound = (coords: LatLngExpression[]) => {
    checkRouteAgainstDangerZones(coords);
  }

  const controlPanelProps = {
    handleSos,
    isTracking,
    trackingSeconds,
    handleToggleTracking,
    handleSetDestination,
    handleOpenReportDialog,
  };

  return (
    <div className="relative h-screen w-screen">
      <GuardianAngelMap
        userPosition={userPosition}
        destination={destination}
        dangerZones={dangerZones}
        activityReports={activityReports}
        onRouteFound={handleRouteFound}
        hasCenteredMap={hasCenteredMap.current}
      />
      {isMobile ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" className="absolute top-4 left-4 z-[1000] shadow-lg">
              <PanelLeft className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[320px] p-0 z-[1001] flex flex-col">
             <SheetHeader className="p-6 pb-0">
              <SheetTitle>Control Panel</SheetTitle>
              <SheetDescription>
                Manage your safety tools and navigation from here.
              </SheetDescription>
            </SheetHeader>
            <ControlPanel {...controlPanelProps} />
          </SheetContent>
        </Sheet>
      ) : (
        <div className="absolute top-0 right-0 h-full w-[400px] z-[1000] p-4">
          <ControlPanel {...controlPanelProps} />
        </div>
      )}
      <AddReportDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleReportSubmit}
      />
    </div>
  );
}
