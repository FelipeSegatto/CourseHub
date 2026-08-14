import NotificationCenterPage from "../../components/notifications/NotificationCenterPage";

export default function NotificationsAdmin() {
  return (
    <NotificationCenterPage
      title="Notificações"
      description="Avisos institucionais e eventos relevantes da plataforma."
      backLink="/admin/dashboard-admin"
    />
  );
}
