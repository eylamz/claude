export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Add admin authentication check here
  return <>{children}</>;
}


