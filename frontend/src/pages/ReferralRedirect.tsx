import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const ReferralRedirect = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (code && typeof code === 'string') {
      try {
        localStorage.setItem('pendingRef', code);
      } catch {}
    }
    // Always redirect to signup with the ref as a query param too (for clarity)
    navigate(`/signup${code ? `?ref=${encodeURIComponent(code)}` : ''}`, { replace: true });
  }, [code, navigate]);

  return null;
};

export default ReferralRedirect;
