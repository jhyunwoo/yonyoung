import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Navigation from "../Navigation";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: "light",
    setTheme: vi.fn()
  })
}));

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => <img {...props} alt={props.alt ?? ""} />
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/"
}));

describe("Navigation", () => {
  it("renders admin link", () => {
    render(<Navigation />);
    expect(screen.getByText("ADMIN")).toBeInTheDocument();
  });
});
