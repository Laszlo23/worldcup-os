export type ProtocolMetric = {
  label: string;
  value: string;
  animate?: boolean;
  numericValue?: number;
};

const FALLBACK_MATCHES_INDEXED = 104;

export function buildProtocolMetrics(matchesIndexed?: number): ProtocolMetric[] {
  const count = matchesIndexed && matchesIndexed > 0 ? matchesIndexed : FALLBACK_MATCHES_INDEXED;

  return [
    {
      label: "World Cup Matches Indexed",
      value: String(count),
      animate: true,
      numericValue: count,
    },
    {
      label: "Event Verification",
      value: "30s",
    },
    {
      label: "Settlement Finality",
      value: "<1 sec",
    },
    {
      label: "Cryptographically Verified",
      value: "100%",
    },
  ];
}
