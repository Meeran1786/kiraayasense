import { BannerForm } from "../BannerForm";

export default function NewBannerPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--ks-text)]">New banner</h1>
      <div className="mt-6">
        <BannerForm />
      </div>
    </div>
  );
}
