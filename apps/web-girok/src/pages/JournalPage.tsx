import { Book } from 'lucide-react';
import PlaceholderPage from '../components/PlaceholderPage';

export default function JournalPage() {
  return (
    <PlaceholderPage
      icon={<Book className="w-10 h-10" />}
      titleKey="home.journal.title"
      descriptionKey="placeholder.journal"
    />
  );
}
