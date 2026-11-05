import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPropertyById } from "@/lib/db/properties";
import { managesProperty } from "@/lib/owner";
import { inviteUrl, qrSvg } from "@/lib/invite";
import { PrintButton } from "@/components/owner/PrintButton";

export const metadata = { title: "Review poster — KiraayaSense", robots: { index: false } };

/** A4 poster for the front desk or notice board: scan to review. */
export default async function PosterPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !/^[0-9a-f-]{36}$/i.test(params.id) || !(await managesProperty(session.user.id, params.id))) notFound();
  const property = await getPropertyById(params.id);
  if (!property) notFound();
  const url = inviteUrl(property.id);
  const svg = await qrSvg(url);
  const housing = property.isHousing;

  return (
    <main className="min-h-screen bg-neutral-200 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end print:hidden">
        <PrintButton />
      </div>
      <div
        className="mx-auto flex aspect-[210/297] max-w-[210mm] flex-col items-center justify-between bg-white p-[14mm] text-center text-slate-900 shadow-lg print:shadow-none"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        <div>
          <p className="text-lg font-bold tracking-tight">
            Kiraaya<span style={{ color: "#e5486b" }}>Sense</span>
          </p>
          <h1 className="mt-8 text-4xl font-extrabold leading-tight">
            {housing ? "Stayed with us?" : "Visited us?"}
            <br />
            Tell others how it went.
          </h1>
          <p className="mt-4 text-lg text-slate-600">Scan to write an honest review of</p>
          <p className="mt-1 text-2xl font-bold">{property.name}</p>
        </div>
        <div className="w-[95mm] max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <div>
          <p className="text-sm text-slate-600">Or open {url.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}</p>
          <p className="mt-6 text-xs text-slate-500">
            Good or bad, every honest review is welcome. Reviews are checked by KiraayaSense and cannot be removed or
            edited by the business.
          </p>
        </div>
      </div>
    </main>
  );
}
