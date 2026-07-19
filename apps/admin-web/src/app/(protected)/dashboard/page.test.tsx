import { render, screen } from "@testing-library/react";
import DashboardPage from "./page";

describe("Admin DashboardPage", () => {
  it("renders dashboard heading", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });
});
