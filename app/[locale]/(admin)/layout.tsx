import { Footer } from "@/components/layout";
import CookieConsentBanner from "@/components/ui/cookie-consent-banner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="min-h-screen">{children}</main>
      <Footer />
      <CookieConsentBanner />
    </>
  );
}


