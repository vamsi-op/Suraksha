'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { addContact, getUserContacts, deleteContact } from '@/lib/firebase/firestore';
import type { EmergencyContact } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Trash2, PlusCircle, ArrowLeft } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import AuthGate from '../auth-gate';

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const userContacts = await getUserContacts();
      setContacts(userContacts);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch contacts.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide both name and phone number.' });
      return;
    }
    try {
      await addContact({ name: newContactName, phone: newContactPhone });
      setNewContactName('');
      setNewContactPhone('');
      toast({ title: 'Success', description: 'Contact added successfully.' });
      fetchContacts(); // Refresh list
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add contact.' });
    }
  };
  
  const handleDeleteContact = async (contactId: string) => {
    try {
      await deleteContact(contactId);
      toast({ title: 'Success', description: 'Contact deleted.' });
      fetchContacts(); // Refresh list
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete contact.' });
    }
  };


  return (
    <AuthGate>
        <div className="flex min-h-screen flex-col items-center bg-gray-100 p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-2xl">
            <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Map
            </Button>
            <Card>
            <CardHeader>
                <CardTitle className="text-2xl">User Profile</CardTitle>
                <CardDescription>Manage your emergency contacts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="font-semibold text-lg mb-2">My Account</h3>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Emergency Contacts</h3>
                    <form onSubmit={handleAddContact} className="flex flex-col sm:flex-row gap-2 items-end">
                        <div className="w-full sm:w-1/2 space-y-1">
                            <Label htmlFor="contact-name">Name</Label>
                            <Input id="contact-name" placeholder="e.g., Jane Doe" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} />
                        </div>
                        <div className="w-full sm:w-1/2 space-y-1">
                             <Label htmlFor="contact-phone">Phone</Label>
                            <Input id="contact-phone" type="tel" placeholder="e.g., +1234567890" value={newContactPhone} onChange={(e) => setNewContactPhone(e.target.value)} />
                        </div>
                        <Button type="submit" className="w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add
                        </Button>
                    </form>
                    <div className="space-y-2">
                        {loading ? (
                            <p>Loading contacts...</p>
                        ) : contacts.length > 0 ? (
                            contacts.map((contact) => (
                            <div key={contact.id} className="flex items-center justify-between rounded-md border p-3">
                                <div>
                                <p className="font-medium">{contact.name}</p>
                                <p className="text-sm text-muted-foreground">{contact.phone}</p>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete the contact for {contact.name}.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteContact(contact.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                            ))
                        ) : (
                            <p className="text-sm text-center text-muted-foreground pt-4">No emergency contacts added yet.</p>
                        )}
                    </div>
                </div>
            </CardContent>
            </Card>
        </div>
        </div>
    </AuthGate>
  );
}
