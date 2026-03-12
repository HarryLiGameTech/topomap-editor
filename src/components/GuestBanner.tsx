import { useNavigate } from 'react-router-dom';

export function GuestBanner() {
  const navigate = useNavigate();

  return (
    <div className="guest-banner">
      <span className="guest-banner-text">
        You're editing locally — changes are not backed up.
      </span>
      <button className="guest-banner-link" onClick={() => navigate('/login')}>
        Log in to save &amp; share →
      </button>
    </div>
  );
}
