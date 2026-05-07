"use client";

export function JDPanel({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold">JD</h2>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 min-h-40 w-full resize-y rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-blue-400"
        placeholder="粘贴岗位 JD"
      />
    </section>
  );
}
