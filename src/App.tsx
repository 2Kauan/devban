import { AppRoutes } from '@/routes';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
}
