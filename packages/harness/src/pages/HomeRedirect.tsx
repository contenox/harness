import { Navigate } from 'react-router-dom';

export default function HomeRedirect() {
  return <Navigate to="/chat" replace />;
}
