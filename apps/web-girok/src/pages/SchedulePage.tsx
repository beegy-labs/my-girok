import { Calendar } from 'lucide-react';
import PlaceholderPage from '../components/PlaceholderPage';

export default function SchedulePage() {
  return (
    <PlaceholderPage
      icon={<Calendar className="w-10 h-10" />}
      titleKey="home.schedule.title"
      descriptionKey="placeholder.schedule"
    />
  );
}
