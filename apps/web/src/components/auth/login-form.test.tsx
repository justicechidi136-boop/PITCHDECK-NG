import { render, screen } from "@testing-library/react";
import { LoginForm } from "@/components/auth/login-form";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/api-client", () => ({
  apiFetch: jest.fn(),
  fetchCsrfToken: jest.fn(),
  ApiClientError: class extends Error {},
}));

describe("LoginForm", () => {
  it("renders sign in form", () => {
    render(<LoginForm />);
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});
