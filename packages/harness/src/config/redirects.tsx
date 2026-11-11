import { Navigate, useParams } from 'react-router-dom';

export const LegacyChatsRedirect = () => <Navigate to="/chat" replace />;
export const LegacyConsoleRedirect = () => <Navigate to="/chat" replace />;
export const ProjectsRedirect = () => <Navigate to="/chat" replace />;
export const AcpChatSessionRedirect = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  return <Navigate to={`/chat/${sessionId}`} replace />;
};
