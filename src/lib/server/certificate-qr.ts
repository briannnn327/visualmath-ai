import QRCode from "qrcode";
import type { CertificateQrMatrix } from "@/components/certificate/certificate-template";

/** Matriks QR sinkron; dipakai oleh preview dan kedua format export. */
export function createCertificateQrMatrix(value: string): CertificateQrMatrix {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  return {
    size: qr.modules.size,
    modules: Array.from(qr.modules.data, (module) => module === 1),
  };
}
