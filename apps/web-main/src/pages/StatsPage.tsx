import { BarChart3 } from 'lucide-react';
import PlaceholderPage from '../components/PlaceholderPage';

export default function StatsPage() {
  return (
    <PlaceholderPage
      icon={<BarChart3 className="w-10 h-10" />}
      titleKey="home.stats.title"
      descriptionKey="placeholder.stats"
    />
  );
}
