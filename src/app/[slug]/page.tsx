import { redirect } from "next/navigation";

interface SlugProps {
  params: Promise<{ slug: string }>;
}

export default async function LegacySlugRedirect({ params }: SlugProps) {
  const { slug } = await params;
  redirect(`/news/${slug}`);
}
