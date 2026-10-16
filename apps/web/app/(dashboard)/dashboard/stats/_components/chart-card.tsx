import type { ReactNode } from "react";
import { Card, CardHeader } from "@/app/(dashboard)/_components/ui/card";

type ChartCardProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** 값이 있으면 차트 대신 이 문구를 보여 준다. */
  empty?: string | null;
  /** 같은 숫자를 표로도 제공해 색이나 모양만으로 읽지 않아도 되게 한다. */
  table?: {
    columns: readonly string[];
    rows: ReadonlyArray<readonly string[]>;
  };
  testId?: string;
  children: ReactNode;
};

export default function ChartCard({
  title,
  description,
  actions,
  empty,
  table,
  testId,
  children,
}: ChartCardProps) {
  return (
    <Card data-testid={testId}>
      <CardHeader title={title} description={description} actions={actions} />
      <div className="mt-4">
        {empty ? <p className="text-caption text-ink-muted">{empty}</p> : children}
      </div>
      {!empty && table && table.rows.length > 0 && (
        <details className="mt-4 text-body-sm">
          <summary className="min-h-11 cursor-pointer content-center rounded-xs text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)">
            표로 보기
          </summary>
          <div className="mt-2 max-h-80 overflow-auto rounded-md border border-hairline">
            <table className="w-full text-left tabular-nums">
              <thead className="sticky top-0 bg-canvas-soft text-caption text-ink-muted">
                <tr>
                  {table.columns.map((column, index) => (
                    <th
                      key={column}
                      scope="col"
                      className={`px-3 py-2 font-medium ${index === 0 ? "" : "text-right"}`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {table.rows.map((row) => (
                  <tr key={row.join("|")}>
                    {row.map((cell, index) => (
                      <td
                        key={`${index}-${cell}`}
                        className={`px-3 py-2 text-ink ${index === 0 ? "" : "text-right"}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </Card>
  );
}
