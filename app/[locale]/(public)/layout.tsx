import { Footer } from "@/components/layout";
import CookieConsentBanner from "@/components/ui/cookie-consent-banner";
import { DeferredAnimatedStyles } from "@/components/DeferredAnimatedStyles";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DeferredAnimatedStyles />
      <main className="min-h-screen max-w-full">{children}</main>
      <Footer />
      <CookieConsentBanner />
    </>
  );
}


