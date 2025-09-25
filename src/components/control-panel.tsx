'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SurakshaLogo } from './icons';
import { Siren, Share2, XCircle, Timer, User, LogOut, MapPin, Search, MessageSquarePlus } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/firebase/auth-context';
import { auth } from '@/lib/firebase/config';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';


interface ControlPanelProps {
  handleSos: () => void;
  isTracking: boolean;
  trackingSeconds: number;
  handleToggleTracking: () => void;
  handleSetDestination: (address: string) => void;
  handleOpenReportDialog: () => void;
}

export default function ControlPanel({
  handleSos,
  isTracking,
  trackingSeconds,
  handleToggleTracking,
  handleSetDestination,
  handleOpenReportDialog,
}: ControlPanelProps) {
  const [sosLoading, setSosLoading] = useState(false);
  const [destinationAddress, setDestinationAddress] = useState('');
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();


  const onSosConfirm = () => {
    setSosLoading(true);
    handleSos();
    // Simulate API call
    setTimeout(() => setSosLoading(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const handleDestinationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (destinationAddress.trim()) {
      handleSetDestination(destinationAddress);
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid Destination',
        description: 'Please enter a destination address.',
      });
    }
  }

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };

  return (
    <Card className="h-full w-full flex flex-col shadow-2xl border-0 md:border">
      <CardHeader className="pt-4 md:pt-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SurakshaLogo className="h-10 w-10 text-primary" />
              <div>
                <CardTitle className="text-2xl font-bold text-primary">Suraksha</CardTitle>
                <CardDescription>Welcome, {user?.email || 'Guest'}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => router.push('/profile')}>
                    <User className="h-5 w-5" />
                </Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <LogOut className="h-5 w-5 text-destructive" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleLogout}>Log Out</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto space-y-6">
        
         <div className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center"><Siren className="mr-2 h-5 w-5 text-destructive" />Safety Tools</h3>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full justify-start text-base py-6">
                  <Siren className="mr-3 h-6 w-6" /> SOS
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Activate SOS?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This is a prototype feature. In a real app, this would send your location to emergency contacts.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onSosConfirm} disabled={sosLoading}>
                    {sosLoading ? 'Sending...' : 'Confirm SOS'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
        
        <Separator />

        <div className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center"><MapPin className="mr-2 h-5 w-5 text-accent"/>Navigation</h3>
            <form onSubmit={handleDestinationSubmit} className="flex gap-2">
                <Input 
                    placeholder="Enter destination..."
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                />
                <Button type="submit" size="icon" aria-label="Set Destination">
                    <Search className="h-5 w-5"/>
                </Button>
            </form>
        </div>
        
        <Separator />
        
        <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center"><Share2 className="mr-2 h-5 w-5 text-accent"/>Location Sharing</h3>
            {isTracking ? (
                <div className="bg-accent/10 p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center text-accent font-semibold">
                            <Timer className="mr-2 h-5 w-5"/>
                            Sharing Active
                        </div>
                        <div className="font-mono text-lg">{formatTime(trackingSeconds)}</div>
                    </div>
                    <Button onClick={handleToggleTracking} variant="outline" className="w-full">
                        <XCircle className="mr-2 h-4 w-4"/>
                        Stop Sharing
                    </Button>
                </div>
            ) : (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="secondary" className="w-full justify-start text-base py-6">
                           <Share2 className="mr-3 h-6 w-6"/> Track Me
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Start Location Sharing?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Your live location will be shared with your trusted contacts for 30 minutes. You can stop sharing at any time.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleToggleTracking}>Start Sharing</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>

        <Separator />
        
        <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center"><MessageSquarePlus className="mr-2 h-5 w-5 text-accent"/>Community Reports</h3>
            <p className="text-sm text-muted-foreground">
                Report suspicious activity at your current location. Your comment will be visible to other users.
            </p>
            <Button onClick={handleOpenReportDialog} variant="outline" className="w-full">
                <MessageSquarePlus className="mr-2 h-4 w-4" /> Report Activity
            </Button>
        </div>
        
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">Stay aware, stay safe. Suraksha is here to help.</p>
      </CardFooter>
    </Card>
  );
}
