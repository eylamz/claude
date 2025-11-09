import HeaderNav from "@/components/layout/HeaderNav";
import MobileNav from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout";

export default function PublicLayout({
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
    </>
  );
}


