// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CertificateActions } from "@/components/certificate/certificate-actions";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CertificateActions", () => {
  it("menonaktifkan kedua tombol selama unduhan dan menampilkan error server", async () => {
    const pending = deferred<Response>();
    const fetchMock = vi.fn(() => pending.promise);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<CertificateActions certificateId="cert-uji" />);
    await user.click(screen.getByRole("button", { name: /download pdf/i }));

    const pdfButton = screen.getByRole("button", { name: /menyiapkan pdf/i });
    expect(pdfButton).toBeDisabled();
    expect(pdfButton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: /download png/i })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/certificates/cert-uji?format=pdf",
      expect.objectContaining({ headers: { Accept: "application/pdf" } }),
    );

    await act(async () => {
      pending.resolve(
        new Response(JSON.stringify({ error: "Sertifikat bukan milik pengguna ini" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      );
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sertifikat bukan milik pengguna ini",
    );
    expect(screen.getByRole("button", { name: /download pdf/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /download png/i })).toBeEnabled();
  });

  it("menampilkan error jaringan dan memulihkan tombol PNG", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Jaringan terputus")));
    const user = userEvent.setup();

    render(<CertificateActions certificateId="cert-uji" compact />);
    await user.click(screen.getByRole("button", { name: /download png/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Jaringan terputus");
    expect(screen.getByRole("button", { name: /download png/i })).toBeEnabled();
  });
});
