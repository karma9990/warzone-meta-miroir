import type { Metadata } from 'next';
import ToolsIndividualClientPage from '@/components/ToolsIndividualClientPage';
import { getUserSession } from '@/lib/userAuth';

export const metadata: Metadata = {
  title: 'Individual Warzone Tools | WZPRO Meta',
  description: 'Choose focused Warzone tools for aim, meta tracking, movement, spawns, optimization and pro habits.',
};

export default async function Page() {
  const user = await getUserSession();
  return <ToolsIndividualClientPage initialUser={user} />;
}
