import { Navigate, useParams, useSearchParams } from 'react-router-dom';

export function PublicCheckoutPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const params = new URLSearchParams(searchParams);
  params.set('tab', 'checkout');
  return <Navigate to={`/r/${slug}?${params.toString()}`} replace />;
}
