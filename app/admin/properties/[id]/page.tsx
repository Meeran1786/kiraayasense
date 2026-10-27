import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PropertyEditForm } from "./PropertyEditForm";

export default async function EditPropertyPage({ params }: { params: { id: string } }) {
  const property = await prisma.property.findUnique({ where: { id: params.id } });
  if (!property) notFound();

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--ks-text)]">{property.name}</h1>
      <div className="mt-6">
        <PropertyEditForm
          initial={{
            id: property.id,
            name: property.name,
            category: property.category,
            status: property.status,
            doorNumber: property.doorNumber,
            street: property.street,
            district: property.district,
            state: property.state,
            pincode: property.pincode,
            approxRentMin: property.approxRentMin ?? 0,
            approxRentMax: property.approxRentMax ?? 0,
          }}
        />
      </div>
    </div>
  );
}
