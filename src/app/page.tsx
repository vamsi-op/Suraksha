import AuthGate from './auth-gate';
import MapPage from './map-page';

export default function Home() {
  return (
    <main>
      <AuthGate>
        <MapPage />
      </AuthGate>
    </main>
  );
}
