import { render, screen } from "@testing-library/react";
import HomePage from "./page";

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

describe("HomePage", () => {
  it("renders primary CTAs", () => {
    render(<HomePage />);
    expect(screen.getByText("Submit Your Idea")).toBeInTheDocument();
    expect(screen.getByText("Discover Innovations")).toBeInTheDocument();
  });

  it("renders brand heading", () => {
    render(<HomePage />);
    expect(
      screen.getByText(/Connect bold ideas with the partners/i),
    ).toBeInTheDocument();
  });
});
