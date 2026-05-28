import { AppLayout } from '@/components/layout/AppLayout';

function App() {
  return (
    <AppLayout>
      <section className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome
        </h2>
        <p className="mt-2 text-slate-600">
          Your React + TypeScript + Vite + Tailwind project is ready.
        </p>
      </section>
    </AppLayout>
  );
}

export default App;
