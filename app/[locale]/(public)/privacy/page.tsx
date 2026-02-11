import { redirect } from 'next/navigation';

export default async function PrivacyRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/terms#privacy-policy`);
}
