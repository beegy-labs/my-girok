import { Wallet } from 'lucide-react';
import PlaceholderPage from '../components/PlaceholderPage';

export default function FinancePage() {
  return (
    <PlaceholderPage
      icon={<Wallet className="w-10 h-10" />}
      titleKey="home.finance.title"
      descriptionKey="placeholder.finance"
    />
  );
}
