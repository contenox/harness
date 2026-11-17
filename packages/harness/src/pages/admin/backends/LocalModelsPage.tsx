import { Container, Page } from '@contenox/ui';
import { useNavigate } from 'react-router-dom';
import { LocalModels } from '../../../components/localAI/LocalModels';

export default function LocalModelsPage() {
  const navigate = useNavigate();
  return (
    <Page bodyScroll="auto" className="h-full">
      <Container padding="px-4 py-4 sm:px-6" innerPadding="p-0">
        <LocalModels onBack={() => navigate('/backends?tab=providers')} />
      </Container>
    </Page>
  );
}
