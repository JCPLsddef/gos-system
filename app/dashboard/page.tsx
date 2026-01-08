import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Server-side redirect to war map (default dashboard view)
  redirect('/dashboard/warmap');
}
