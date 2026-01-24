import HeaderNav from "@/components/layout/HeaderNav";
import MobileNav from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout";
import CookieConsentBanner from "@/components/ui/cookie-consent-banner";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <HeaderNav />
      <main className="min-h-screen max-w-full">{children}</main>
      <Footer />
      <MobileNav />
      <CookieConsentBanner />
    </>
  );
}


