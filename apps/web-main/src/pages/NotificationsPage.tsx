import { Bell } from 'lucide-react';
import PlaceholderPage from '../components/PlaceholderPage';

export default function NotificationsPage() {
  return (
    <PlaceholderPage
      icon={<Bell className="w-10 h-10" />}
      titleKey="home.notifications.title"
      descriptionKey="placeholder.notifications"
    />
  );
}
