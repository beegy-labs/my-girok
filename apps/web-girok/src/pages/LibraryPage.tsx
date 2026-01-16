import { Library } from 'lucide-react';
import PlaceholderPage from '../components/PlaceholderPage';

export default function LibraryPage() {
  return (
    <PlaceholderPage
      icon={<Library className="w-10 h-10" />}
      titleKey="home.library.title"
      descriptionKey="placeholder.library"
    />
  );
}
