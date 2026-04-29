import { PublicQuotePage } from "@/components/public-quote-page";

export default async function PublicQuoteRoute({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <PublicQuotePage token={token} />;
}
