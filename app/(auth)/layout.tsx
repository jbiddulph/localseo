export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f6c5611f,#7bd9b12a,#f8f4ef)] px-6 py-16">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        {children}
      </div>
    </div>
  );
}
