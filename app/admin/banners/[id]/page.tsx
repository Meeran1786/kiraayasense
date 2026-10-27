import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BannerForm } from "../BannerForm";

export default async function EditBannerPage({ params }: { params: { id: string } }) {
  const banner = await prisma.adBanner.findUnique({ where: { id: params.id } });
  if (!banner) notFound();

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--ks-text)]">Edit banner</h1>
      <div className="mt-6">
        <BannerForm
          initial={{
            id: banner.id,
            title: banner.title,
            imageStorageKey: banner.imageStorageKey,
            clickThroughUrl: banner.clickThroughUrl,
            placement: banner.placement,
            status: banner.status,
            targetImpressions: banner.targetImpressions,
            startAt: banner.startAt.toISOString(),
            endAt: banner.endAt.toISOString(),
            advertiserName: banner.advertiserName,
            advertiserContact: banner.advertiserContact ?? "",
          }}
        />
      </div>
    </div>
  );
}
