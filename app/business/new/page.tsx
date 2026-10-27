import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCategoryTree } from "@/lib/db/categories";
import { AddBusinessForm } from "@/components/business/AddBusinessForm";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { Footer } from "@/components/layout/Footer";
import { brand } from "@/lib/brand";

export const metadata = { title: "Add a business — KiraayaSense" };

export default async function AddBusinessPage({ searchParams }: { searchParams: { name?: string } }) {
  const session = await getServerSession(authOptions);
  const categories = await getCategoryTree();

  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ks-text)]">Add a business</h1>
          <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
            Can&apos;t find the place you want to review? Add it here. A moderator checks it before it goes live.
          </p>
        </div>
        {session?.user?.id ? (
          <AddBusinessForm categories={categories} initialName={searchParams.name?.slice(0, 120) ?? ""} />
        ) : (
          <SignInPrompt text="Sign in to add a business." callbackUrl="/business/new" />
        )}
      </div>
      <Footer />
    </main>
  );
}
