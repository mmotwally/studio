export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-6">Cabinet Console</h1>
      <p className="text-xl mb-8">Efficiently manage your inventory, requisitions, and purchase orders.</p>
      <a href="/dashboard" className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
        Go to Dashboard
      </a>
    </div>
  );
}