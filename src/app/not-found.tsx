import Link from 'next/link';
export default function NotFound() {
  return <div className="empty"><h1>Page not found</h1><p>The link may have changed. Your bookings are available in your account.</p><Link className="button" href="/">Back to home</Link></div>;
}
