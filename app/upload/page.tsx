// app/upload/page.tsx  (server component)
import { requireUser } from '@/lib/server-auth';
import UploadClient from './ui';

export default async function UploadPage() {
  await requireUser();          // redirects to /login if not authenticated
  return <UploadClient />;
}
