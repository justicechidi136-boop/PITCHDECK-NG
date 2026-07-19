import Link from "next/link";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@pitchdeck/ui";

const sectors = [
  "Agriculture & AgriTech",
  "FinTech & Financial Services",
  "HealthTech & Biotech",
  "EdTech & Learning",
  "Energy & CleanTech",
  "AI & Data Science",
  "Creative Economy",
  "GovTech & Civic Innovation",
];

const steps = [
  {
    title: "Share your innovation",
    description:
      "Innovators, students, and researchers submit ideas with context on impact and sector.",
  },
  {
    title: "Get discovered",
    description:
      "Sponsors, investors, agencies, and diaspora partners explore curated innovation profiles.",
  },
  {
    title: "Build partnerships",
    description:
      "Connect through structured reviews, mentorship, and sponsorship pathways.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-[var(--color-bg)]">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand-primary)]/10 via-transparent to-[var(--color-brand-accent)]/10"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <Badge variant="warning">Nigeria&apos;s Innovation Bridge</Badge>
            <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-[var(--color-fg)] sm:text-5xl lg:text-6xl">
              Connect bold ideas with the partners who can scale them
            </h1>
            <p className="mt-6 text-lg text-[var(--color-fg-muted)]">
              PitchDeck Nigeria links innovators across every state with government
              agencies, corporates, investors, NGOs, universities, incubators, and
              diaspora sponsors.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/auth/register">
                <Button size="lg">Submit Your Idea</Button>
              </Link>
              <Link href="/discover">
                <Button variant="outline" size="lg">
                  Discover Innovations
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="sectors" className="bg-[var(--color-bg-muted)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold text-[var(--color-fg)]">
              Innovation across every sector
            </h2>
            <p className="mt-3 text-[var(--color-fg-muted)]">
              From agritech in the North West to creative economy ventures in Lagos,
              discover solutions shaped by local context and national ambition.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sectors.map((sector) => (
              <Card key={sector}>
                <CardHeader>
                  <CardTitle className="text-base">{sector}</CardTitle>
                  <CardDescription>
                    Explore innovations shaping this sector across Nigeria.
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-[var(--color-fg)]">
            How it works
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <Card key={step.title}>
                <CardContent className="pt-6">
                  <span className="text-sm font-semibold text-[var(--color-brand-accent)]">
                    Step {index + 1}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--color-fg)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-brand-primary)] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold">
            Sponsor the next generation of Nigerian innovators
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/85">
            Corporate organisations, angel investors, VC firms, philanthropists, and
            diaspora sponsors can discover vetted innovation pipelines aligned with
            strategic priorities.
          </p>
          <div className="mt-8">
            <Link href="/auth/register?role=sponsor">
              <Button variant="secondary" size="lg">
                Become a Sponsor
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
