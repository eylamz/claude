export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Add authentication check here
  return <>{children}</>;
}


