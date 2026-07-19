import { EmptyState, PageHeader } from "@pitchdeck/ui";

export function AdminPlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} />
      <EmptyState
        title={`${title} module not implemented`}
        description="This admin section is reserved for a future product milestone. No placeholder business logic is included."
      />
    </div>
  );
}
