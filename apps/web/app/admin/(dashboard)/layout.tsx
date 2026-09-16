import { AdminSidebar } from '@/components/layout/admin-sidebar';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
