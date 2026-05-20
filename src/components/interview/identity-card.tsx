type IdentityCardProps = {
  name: string;
  profile: string;
  jdTitle?: string | null;
  hasResume?: boolean;
  llmModel?: string | null;
  lastSessionStatus?: string;
};

export function IdentityCard({ name, profile, jdTitle, hasResume, llmModel, lastSessionStatus }: IdentityCardProps) {
  return (
    <div className="h-full rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-blue-300 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
        {lastSessionStatus ? (
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">{lastSessionStatus}</span>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{jdTitle || profile}</p>
      <p className="mt-4 text-xs text-gray-400">
        {hasResume ? "已上传简历" : "未上传简历"}
        {llmModel ? ` · ${llmModel}` : ""}
      </p>
    </div>
  );
}
