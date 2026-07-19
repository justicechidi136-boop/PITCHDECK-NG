import { render, screen } from "@testing-library/react";
import { Button } from "./components/button.js";
import { Badge } from "./components/badge.js";
import { LoadingState } from "./components/loading-state.js";
import { EmptyState } from "./components/empty-state.js";

describe("@pitchdeck/ui", () => {
  it("renders Button", () => {
    render(<Button>Submit</Button>);
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("renders Badge", () => {
    render(<Badge>Innovator</Badge>);
    expect(screen.getByText("Innovator")).toBeInTheDocument();
  });

  it("renders LoadingState with accessible status", () => {
    render(<LoadingState label="Fetching data" />);
    expect(screen.getByRole("status")).toHaveTextContent("Fetching data");
  });

  it("renders EmptyState", () => {
    render(
      <EmptyState
        title="No pitches yet"
        description="Innovation submissions will appear here."
      />,
    );
    expect(screen.getByText("No pitches yet")).toBeInTheDocument();
  });
});
