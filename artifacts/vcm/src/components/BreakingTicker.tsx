import { useGetBreakingNews } from "@workspace/api-client-react";

export default function BreakingTicker() {
  const { data } = useGetBreakingNews();

  if (!data?.enabled || !data.text) return null;

  return (
    <div
      className="bg-primary text-primary-foreground flex items-center overflow-hidden"
      style={{ height: "36px" }}
      data-testid="breaking-ticker"
    >
      <span className="shrink-0 bg-red-600 text-white text-xs font-extrabold px-3 py-1 uppercase tracking-wider">
        BREAKING
      </span>
      <div className="relative overflow-hidden flex-1 ml-2">
        <span className="ticker-content text-sm font-medium inline-block">
          {data.text}
        </span>
      </div>
    </div>
  );
}
