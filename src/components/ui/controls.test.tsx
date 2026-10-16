// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

describe("Button", () => {
  it("merender label dan memicu onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Kirim</Button>);
    await user.click(screen.getByRole("button", { name: /kirim/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("menonaktifkan tombol saat loading", () => {
    render(<Button loading>Simpan</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("Field + Input", () => {
  it("merender label terhubung ke input dan hint", () => {
    render(
      <Field label="Email" htmlFor="email" hint="Masukkan email aktif">
        <Input id="email" />
      </Field>,
    );
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByText("Masukkan email aktif")).toBeInTheDocument();
  });

  it("menampilkan pesan error dengan role alert", () => {
    render(
      <Field label="Email" htmlFor="email" error="Email tidak valid">
        <Input id="email" />
      </Field>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Email tidak valid");
  });

  it("input mengikuti perubahan nilai pengguna", async () => {
    const user = userEvent.setup();
    render(<Input id="email" aria-label="Email" />);
    const input = screen.getByLabelText("Email");
    await user.type(input, "maria@students.uns.ac.id");
    expect(input).toHaveValue("maria@students.uns.ac.id");
  });
});
