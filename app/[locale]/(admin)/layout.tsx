import HeaderNav from "@/components/layout/HeaderNav";
import MobileNav from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin layout uses the same navigation as public/protected layouts
  return (
    <>
      <HeaderNav />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <MobileNav />
    </>
  );
}


