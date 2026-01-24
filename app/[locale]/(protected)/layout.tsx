import HeaderNav from "@/components/layout/HeaderNav";
import MobileNav from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout";
import CookieConsentBanner from "@/components/ui/cookie-consent-banner";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <HeaderNav />
      <main className="pt-20 min-h-screen">{children}</main>
      <Footer />
      <MobileNav />
      <CookieConsentBanner />
    </>
  );
}


