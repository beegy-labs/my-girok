import { Users } from 'lucide-react';
import PlaceholderPage from '../components/PlaceholderPage';

export default function NetworkPage() {
  return (
    <PlaceholderPage
      icon={<Users className="w-10 h-10" />}
      titleKey="home.network.title"
      descriptionKey="placeholder.network"
    />
  );
}
