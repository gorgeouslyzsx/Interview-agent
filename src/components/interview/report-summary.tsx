import type { InterviewReport } from "@/lib/domain/types";

export function ReportSummary({ report }: { report: InterviewReport }) {
  return (
    <section className="space-y-5 rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">总分</p>
          <div className="mt-2 text-5xl font-semibold text-gray-950">{report.overallScore}</div>
        </div>
        <p className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">{report.result}</p>
      </div>
      <p className="text-sm leading-6 text-gray-600">{report.summary}</p>
      <div className="space-y-3">
        {report.skillScores.map((score) => (
          <div key={score.skill}>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-800">{score.skill}</span>
              <span className="text-gray-500">{score.score}/10</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-blue-600" style={{ width: `${score.score * 10}%` }} />
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-500">{score.suggestion}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
