export function IdentityCard({ name, profile }: { name: string; profile: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-500">{profile}</p>
    </div>
  );
}
