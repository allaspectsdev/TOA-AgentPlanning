import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/trpc/server';

export default async function HomePage() {
  const session = await getServerSession();

  if (session) {
    redirect('/projects');
  } else {
    redirect('/login');
  }
}
