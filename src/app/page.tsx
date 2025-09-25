import AuthGate from './auth-gate';
import MapPage from './map-page';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export default function Home() {
  return (
    <main>
      <AuthGate>
        <FirebaseErrorListener />
        <MapPage />
      </AuthGate>
    </main>
  );
}
