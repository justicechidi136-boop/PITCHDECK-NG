import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from "@pitchdeck/ui";

const overviewCards = [
  { title: "Total Users", value: "—", description: "Awaiting user management module" },
  { title: "Active Pitches", value: "—", description: "Awaiting pitch submission module" },
  { title: "Sponsors", value: "—", description: "Awaiting sponsor onboarding module" },
  { title: "Pending Reviews", value: "—", description: "Awaiting review workflow module" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of platform activity. Metrics will populate once business modules are integrated."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-3xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--color-fg-muted)]">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
