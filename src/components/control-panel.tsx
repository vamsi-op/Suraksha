'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { GuardianAngelLogo } from './icons';
import { Siren, Share2, XCircle, Timer } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface ControlPanelProps {
  handleSos: () => void;
  isTracking: boolean;
  trackingSeconds: number;
  handleToggleTracking: () => void;
}

export default function ControlPanel({
  handleSos,
  isTracking,
  trackingSeconds,
  handleToggleTracking,
}: ControlPanelProps) {
  const [sosLoading, setSosLoading] = useState(false);

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

  return (
    <Card className="h-full w-full flex flex-col shadow-2xl">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <GuardianAngelLogo className="h-10 w-10 text-primary" />
          <div>
            <CardTitle className="text-2xl font-bold text-primary">Guardian Angel</CardTitle>
            <CardDescription>Your personal safety companion</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto space-y-6">
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center"><Siren className="mr-2 h-5 w-5 text-destructive" />Safety Tools</h3>
          <div className="grid grid-cols-1 gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full justify-start text-base py-6">
                  <Siren className="mr-3 h-6 w-6" /> Help Me (SOS)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Activate SOS?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will immediately send your current location to your emergency contacts. Are you sure you want to proceed?
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
        
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">Stay aware, stay safe. Guardian Angel is here to help.</p>
      </CardFooter>
    </Card>
  );
}
