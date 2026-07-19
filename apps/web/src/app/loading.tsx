import { LoadingState } from "@pitchdeck/ui";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24">
      <LoadingState label="Loading PitchDeck Nigeria..." />
    </div>
  );
}
