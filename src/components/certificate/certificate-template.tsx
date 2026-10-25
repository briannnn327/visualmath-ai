import { CERTIFICATE_MAX_SCORE, formatCertificateDate } from "@/lib/certificate";

/* =========================================================
   Satu template sertifikat untuk preview, PNG, dan PDF.
   Semua teks berasal dari props; tidak ada placeholder yang bisa
   diedit pengguna. Ornamen dibuat dengan SVG agar tetap tajam.
   ========================================================= */

export interface CertificateQrMatrix {
  /** Jumlah modul QR per sisi (tanpa quiet zone). */
  size: number;
  /** Matriks row-major; true berarti modul gelap. */
  modules: boolean[];
}

export interface CertificateTemplateProps {
  recipientName: string;
  topicTitle: string;
  score: number;
  maxScore?: number;
  xp?: number;
  code: string;
  issuedAt: Date | string;
  verificationUrl: string;
  qr: CertificateQrMatrix;
}

const PALETTE = {
  navy: "#07152F",
  midnight: "#0B1F46",
  electric: "#2589FF",
  cyan: "#57D9FF",
  violet: "#A58BFF",
  gold: "#E8CB83",
  white: "#F5F8FF",
} as const;

const DISPLAY_FONT = "Inter, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const MONO_FONT = "'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace";
const SERIF_FONT = "Georgia, 'Times New Roman', serif";

function wrapWords(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  const pushLongWord = (word: string) => {
    let rest = word;
    while (rest.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }
      lines.push(rest.slice(0, maxChars));
      rest = rest.slice(maxChars);
    }
    if (rest) current = rest;
  };

  for (const word of words) {
    if (word.length > maxChars) {
      pushLongWord(word);
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function fitText(
  text: string,
  candidates: Array<{ size: number; maxChars: number }>,
  maxLines: number,
): { size: number; lines: string[] } {
  for (const candidate of candidates) {
    const lines = wrapWords(text, candidate.maxChars);
    if (lines.length <= maxLines) return { size: candidate.size, lines };
  }

  const fallback = candidates[candidates.length - 1];
  const lines = wrapWords(text, fallback.maxChars);
  if (lines.length <= maxLines) return { size: fallback.size, lines };

  const visible = lines.slice(0, maxLines);
  const last = visible[maxLines - 1] ?? "";
  visible[maxLines - 1] = `${last.slice(0, Math.max(1, fallback.maxChars - 1)).trimEnd()}…`;
  return { size: fallback.size, lines: visible };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function QrCode({
  qr,
  x,
  y,
  size,
}: {
  qr: CertificateQrMatrix;
  x: number;
  y: number;
  size: number;
}) {
  const quietZone = 4;
  const totalModules = qr.size + quietZone * 2;
  const cell = size / totalModules;

  return (
    <g>
      <rect
        x={x - 6}
        y={y - 6}
        width={size + 12}
        height={size + 12}
        rx={12}
        fill={PALETTE.white}
        stroke={PALETTE.gold}
        strokeOpacity={0.5}
      />
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        rx={4}
        fill={PALETTE.white}
        shapeRendering="crispEdges"
      />
      {qr.modules.map((dark, index) => {
        if (!dark) return null;
        const row = Math.floor(index / qr.size);
        const col = index % qr.size;
        return (
          <rect
            key={index}
            x={x + (col + quietZone) * cell}
            y={y + (row + quietZone) * cell}
            width={cell + 0.18}
            height={cell + 0.18}
            fill={PALETTE.navy}
            shapeRendering="crispEdges"
          />
        );
      })}
      <g stroke={PALETTE.cyan} strokeWidth={2} fill="none">
        <path d={`M${x - 12} ${y - 12}h18M${x - 12} ${y - 12}v18`} />
        <path d={`M${x + size + 12} ${y - 12}h-18M${x + size + 12} ${y - 12}v18`} />
        <path d={`M${x - 12} ${y + size + 12}h18M${x - 12} ${y + size + 12}v-18`} />
        <path d={`M${x + size + 12} ${y + size + 12}h-18M${x + size + 12} ${y + size + 12}v-18`} />
      </g>
    </g>
  );
}

export function CertificateTemplate({
  recipientName,
  topicTitle,
  score,
  maxScore = CERTIFICATE_MAX_SCORE,
  xp = 0,
  code,
  issuedAt,
  verificationUrl,
  qr,
}: CertificateTemplateProps) {
  const safeName = recipientName.trim() || "Penerima Sertifikat";
  const safeTopic = topicTitle.trim() || "Latihan Matematika";
  const safeScore = clamp(Math.round(score), 0, maxScore);
  const nameFit = fitText(
    safeName,
    [
      { size: 82, maxChars: 22 },
      { size: 72, maxChars: 25 },
      { size: 62, maxChars: 29 },
      { size: 52, maxChars: 35 },
      { size: 44, maxChars: 41 },
    ],
    3,
  );
  const topicFit = fitText(
    safeTopic,
    [
      { size: 30, maxChars: 54 },
      { size: 26, maxChars: 62 },
      { size: 22, maxChars: 74 },
      { size: 20, maxChars: 82 },
    ],
    2,
  );

  const nameTop = 330;
  const nameLineHeight = Math.round(nameFit.size * 1.16);
  const nameBaselines = nameFit.lines.map(
    (_, index) => nameTop + nameFit.size + index * nameLineHeight,
  );
  const nameBottom = nameTop + nameFit.size + (nameFit.lines.length - 1) * nameLineHeight;
  const nameUnderlineY = nameBottom + 14;
  const bodyY = Math.max(470, nameUnderlineY + 32);
  const topicPillY = bodyY + 22;
  const topicFontSize = topicFit.size;
  const topicLineHeight = Math.round(topicFontSize * 1.2);
  const topicPillHeight = 26 + topicFit.lines.length * topicLineHeight;
  const topicBaselines = topicFit.lines.map(
    (_, index) => topicPillY + 20 + topicFontSize + index * topicLineHeight,
  );
  const progressWidth = 300;
  const scoreRatio = maxScore > 0 ? safeScore / maxScore : 0;
  const verificationHost = (() => {
    try {
      return new URL(verificationUrl).host;
    } catch {
      return "visualmath.ai";
    }
  })();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1600 900"
      width="1600"
      height="900"
      role="img"
      aria-labelledby="vma-certificate-title vma-certificate-desc"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <title id="vma-certificate-title">
        {`Sertifikat Pencapaian VisualMath AI untuk ${safeName}`}
      </title>
      <desc id="vma-certificate-desc">
        {`Sertifikat pencapaian pembelajaran ${safeTopic} dengan skor ${safeScore} dari ${maxScore}, diterbitkan ${formatCertificateDate(issuedAt)}. Kode sertifikat ${code}. Verifikasi di ${verificationHost}.`}
      </desc>

      <defs>
        <linearGradient id="cert-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={PALETTE.navy} />
          <stop offset="52%" stopColor={PALETTE.midnight} />
          <stop offset="100%" stopColor="#061126" />
        </linearGradient>
        <linearGradient id="cert-gold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D7B56A" />
          <stop offset="42%" stopColor="#FFF2C4" />
          <stop offset="72%" stopColor={PALETTE.gold} />
          <stop offset="100%" stopColor="#C79A43" />
        </linearGradient>
        <linearGradient id="cert-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={PALETTE.electric} />
          <stop offset="55%" stopColor={PALETTE.cyan} />
          <stop offset="100%" stopColor={PALETTE.violet} />
        </linearGradient>
        <linearGradient id="cert-logo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#123B78" />
          <stop offset="100%" stopColor="#07152F" />
        </linearGradient>
        <radialGradient id="cert-glow-blue" cx="18%" cy="16%" r="55%">
          <stop offset="0%" stopColor={PALETTE.electric} stopOpacity={0.2} />
          <stop offset="100%" stopColor={PALETTE.electric} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="cert-glow-violet" cx="88%" cy="84%" r="48%">
          <stop offset="0%" stopColor={PALETTE.violet} stopOpacity={0.16} />
          <stop offset="100%" stopColor={PALETTE.violet} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="cert-glow-cyan" cx="50%" cy="42%" r="42%">
          <stop offset="0%" stopColor={PALETTE.cyan} stopOpacity={0.07} />
          <stop offset="100%" stopColor={PALETTE.cyan} stopOpacity={0} />
        </radialGradient>
        <pattern id="cert-dots" width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill={PALETTE.white} opacity={0.08} />
        </pattern>
        <pattern id="cert-grid" width="52" height="52" patternUnits="userSpaceOnUse">
          <path
            d="M 52 0 L 0 0 0 52"
            fill="none"
            stroke={PALETTE.electric}
            strokeWidth="0.75"
            opacity={0.12}
          />
        </pattern>
        <filter id="cert-soft-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="cert-frame">
          <rect x="24" y="24" width="1552" height="852" rx="24" />
        </clipPath>
      </defs>

      {/* ================= BACKGROUND ================= */}
      <rect width="1600" height="900" fill="url(#cert-bg)" />
      <g clipPath="url(#cert-frame)">
        <rect width="1600" height="900" fill="url(#cert-glow-blue)" />
        <rect width="1600" height="900" fill="url(#cert-glow-violet)" />
        <rect width="1600" height="900" fill="url(#cert-glow-cyan)" />
        <rect width="1600" height="900" fill="url(#cert-dots)" />
        <rect x="60" y="60" width="1480" height="780" fill="url(#cert-grid)" opacity={0.38} />

        {/* Ornamen koordinat kartesius */}
        <g transform="translate(52 520)" opacity={0.18}>
          <g stroke={PALETTE.white} strokeWidth="1">
            <line x1="0" y1="120" x2="300" y2="120" />
            <line x1="0" y1="120" x2="0" y2="-92" />
            <line x1="60" y1="120" x2="60" y2="-92" strokeOpacity="0.25" />
            <line x1="120" y1="120" x2="120" y2="-92" strokeOpacity="0.25" />
            <line x1="180" y1="120" x2="180" y2="-92" strokeOpacity="0.25" />
            <line x1="240" y1="120" x2="240" y2="-92" strokeOpacity="0.25" />
            <line x1="0" y1="60" x2="300" y2="60" strokeOpacity="0.25" />
            <line x1="0" y1="0" x2="300" y2="0" strokeOpacity="0.25" />
            <line x1="0" y1="-60" x2="300" y2="-60" strokeOpacity="0.25" />
          </g>
          <path
            d="M 0 108 Q 82 -64 168 108 T 300 4"
            fill="none"
            stroke={PALETTE.cyan}
            strokeWidth="2.5"
          />
          <path
            d="M 0 24 C 68 112 112 -40 192 52 S 272 116 300 -10"
            fill="none"
            stroke={PALETTE.violet}
            strokeWidth="1.8"
            strokeDasharray="5 7"
          />
          <circle cx="168" cy="108" r="3.5" fill={PALETTE.gold} />
          <text x="292" y="138" fill={PALETTE.white} fontFamily={SERIF_FONT} fontSize="15">
            x
          </text>
          <text x="-18" y="-86" fill={PALETTE.white} fontFamily={SERIF_FONT} fontSize="15">
            y
          </text>
        </g>

        {/* Ornamen integral, sigma, dan neural network */}
        <g opacity={0.16}>
          <text
            x="1215"
            y="365"
            fill={PALETTE.violet}
            fontFamily={SERIF_FONT}
            fontSize="220"
            opacity={0.36}
          >
            ∑
          </text>
          <text
            x="1382"
            y="520"
            fill={PALETTE.cyan}
            fontFamily={SERIF_FONT}
            fontSize="230"
            opacity={0.3}
          >
            ∫
          </text>
          <g stroke={PALETTE.electric} strokeWidth="1.3" fill="none">
            <line x1="1175" y1="180" x2="1280" y2="130" />
            <line x1="1175" y1="180" x2="1280" y2="234" />
            <line x1="1280" y1="130" x2="1390" y2="168" />
            <line x1="1280" y1="130" x2="1390" y2="268" />
            <line x1="1280" y1="234" x2="1390" y2="168" />
            <line x1="1280" y1="234" x2="1390" y2="268" />
            <line x1="1390" y1="168" x2="1490" y2="115" />
            <line x1="1390" y1="168" x2="1490" y2="220" />
            <line x1="1390" y1="268" x2="1490" y2="220" />
          </g>
          <g fill={PALETTE.cyan}>
            <circle cx="1175" cy="180" r="5" />
            <circle cx="1280" cy="130" r="6" />
            <circle cx="1280" cy="234" r="5" />
            <circle cx="1390" cy="168" r="7" />
            <circle cx="1390" cy="268" r="5" />
            <circle cx="1490" cy="115" r="4" />
            <circle cx="1490" cy="220" r="4" />
          </g>
        </g>

        {/* Garis kurva halus di belakang area nama */}
        <path
          d="M 230 610 C 470 520 640 660 850 570 S 1190 510 1370 590"
          fill="none"
          stroke={PALETTE.electric}
          strokeWidth="1.2"
          opacity={0.12}
        />
        <path
          d="M 180 636 C 420 546 650 690 880 596 S 1210 548 1420 620"
          fill="none"
          stroke={PALETTE.gold}
          strokeWidth="1"
          opacity={0.1}
        />
      </g>

      {/* ================= BINGKAI ================= */}
      <rect
        x="28"
        y="28"
        width="1544"
        height="844"
        rx="22"
        fill="none"
        stroke={PALETTE.gold}
        strokeOpacity={0.62}
        strokeWidth="2"
      />
      <rect
        x="40"
        y="40"
        width="1520"
        height="820"
        rx="15"
        fill="none"
        stroke={PALETTE.electric}
        strokeOpacity={0.36}
        strokeWidth="1.5"
      />
      <rect
        x="50"
        y="50"
        width="1500"
        height="800"
        rx="10"
        fill="none"
        stroke={PALETTE.cyan}
        strokeOpacity={0.16}
        strokeWidth="1"
      />

      {/* Sudut sirkuit */}
      <g>
        <g stroke={PALETTE.electric} strokeWidth="2.2" fill="none" opacity={0.88}>
          <path d="M72 154V72h82" />
          <path d="M72 110h32V78h28" />
          <circle cx="72" cy="72" r="4" fill={PALETTE.cyan} stroke="none" />
          <circle cx="132" cy="78" r="3" fill={PALETTE.gold} stroke="none" />
        </g>
        <g
          transform="translate(1528 72) scale(-1 1)"
          stroke={PALETTE.electric}
          strokeWidth="2.2"
          fill="none"
          opacity={0.88}
        >
          <path d="M0 82V0h82" />
          <path d="M0 38h32V6h28" />
          <circle cx="0" cy="0" r="4" fill={PALETTE.cyan} stroke="none" />
          <circle cx="60" cy="6" r="3" fill={PALETTE.gold} stroke="none" />
        </g>
        <g
          transform="translate(72 828) scale(1 -1)"
          stroke={PALETTE.electric}
          strokeWidth="2.2"
          fill="none"
          opacity={0.88}
        >
          <path d="M0 82V0h82" />
          <path d="M0 38h32V6h28" />
          <circle cx="0" cy="0" r="4" fill={PALETTE.cyan} stroke="none" />
          <circle cx="60" cy="6" r="3" fill={PALETTE.gold} stroke="none" />
        </g>
        <g
          transform="translate(1528 828) scale(-1 -1)"
          stroke={PALETTE.electric}
          strokeWidth="2.2"
          fill="none"
          opacity={0.88}
        >
          <path d="M0 82V0h82" />
          <path d="M0 38h32V6h28" />
          <circle cx="0" cy="0" r="4" fill={PALETTE.cyan} stroke="none" />
          <circle cx="60" cy="6" r="3" fill={PALETTE.gold} stroke="none" />
        </g>
      </g>

      {/* ================= HEADER / BRAND ================= */}
      <g transform="translate(622 66)">
        <path
          d="M34 2 62 18v32L34 66 6 50V18Z"
          fill="url(#cert-logo)"
          stroke={PALETTE.cyan}
          strokeOpacity={0.85}
          strokeWidth="1.6"
        />
        <path
          d="m15 48 10-18 10 10 17-21"
          fill="none"
          stroke="url(#cert-gold)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g fill={PALETTE.cyan}>
          <circle cx="15" cy="48" r="2.8" />
          <circle cx="25" cy="30" r="2.8" />
          <circle cx="35" cy="40" r="2.8" />
          <circle cx="52" cy="19" r="2.8" />
        </g>
      </g>
      <text
        x="698"
        y="99"
        fill={PALETTE.white}
        fontFamily={DISPLAY_FONT}
        fontSize="29"
        fontWeight="800"
        letterSpacing="7"
      >
        VISUALMATH AI
      </text>
      <text
        x="700"
        y="124"
        fill={PALETTE.cyan}
        fontFamily={DISPLAY_FONT}
        fontSize="10.5"
        fontWeight="600"
        letterSpacing="4.2"
      >
        AI + INTERACTIVE VISUALIZATION
      </text>

      <g>
        <line x1="336" y1="154" x2="604" y2="154" stroke={PALETTE.electric} strokeOpacity={0.35} />
        <line x1="996" y1="154" x2="1264" y2="154" stroke={PALETTE.electric} strokeOpacity={0.35} />
        <path d="M800 148l6 6-6 6-6-6z" fill={PALETTE.gold} />
      </g>

      {/* ================= JUDUL ================= */}
      <text
        x="800"
        y="207"
        textAnchor="middle"
        fill="url(#cert-gold)"
        fontFamily={DISPLAY_FONT}
        fontSize="52"
        fontWeight="800"
        letterSpacing="4.8"
        filter="url(#cert-soft-glow)"
      >
        CERTIFICATE OF ACHIEVEMENT
      </text>
      <text
        x="800"
        y="239"
        textAnchor="middle"
        fill={PALETTE.white}
        fillOpacity={0.82}
        fontFamily={DISPLAY_FONT}
        fontSize="20"
        fontWeight="500"
        letterSpacing="2"
      >
        Sertifikat Pencapaian Pembelajaran
      </text>
      <g>
        <line
          x1="654"
          y1="260"
          x2="782"
          y2="260"
          stroke="url(#cert-cyan)"
          strokeWidth="1.4"
          strokeOpacity={0.8}
        />
        <path d="M800 254l6 6-6 6-6-6z" fill={PALETTE.gold} />
        <line
          x1="818"
          y1="260"
          x2="946"
          y2="260"
          stroke="url(#cert-cyan)"
          strokeWidth="1.4"
          strokeOpacity={0.8}
        />
      </g>

      {/* ================= NAMA PENERIMA ================= */}
      <text
        x="800"
        y="302"
        textAnchor="middle"
        fill={PALETTE.cyan}
        fontFamily={DISPLAY_FONT}
        fontSize="13"
        fontWeight="700"
        letterSpacing="4.2"
      >
        DIBERIKAN KEPADA
      </text>
      <text
        x="800"
        textAnchor="middle"
        fill={PALETTE.white}
        fontFamily={DISPLAY_FONT}
        fontSize={nameFit.size}
        fontWeight="800"
        letterSpacing="0.8"
      >
        {nameBaselines.map((baseline, index) => (
          <tspan key={`${nameFit.lines[index]}-${baseline}`} x="800" y={baseline}>
            {nameFit.lines[index]}
          </tspan>
        ))}
      </text>
      <g>
        <line
          x1="330"
          y1={nameUnderlineY}
          x2="770"
          y2={nameUnderlineY}
          stroke={PALETTE.gold}
          strokeWidth="1"
          strokeOpacity={0.48}
        />
        <path d={`M800 ${nameUnderlineY - 5}l5 5-5 5-5-5z`} fill={PALETTE.cyan} />
        <line
          x1="830"
          y1={nameUnderlineY}
          x2="1270"
          y2={nameUnderlineY}
          stroke={PALETTE.gold}
          strokeWidth="1"
          strokeOpacity={0.48}
        />
      </g>

      <text
        x="800"
        y={bodyY}
        textAnchor="middle"
        fill={PALETTE.white}
        fillOpacity={0.76}
        fontFamily={DISPLAY_FONT}
        fontSize="19"
        fontWeight="400"
      >
        Sebagai penghargaan atas keberhasilan menyelesaikan evaluasi pembelajaran matematika pada
        topik
      </text>

      {/* Nama kuis/topik */}
      <rect
        x={(1600 - 1040) / 2}
        y={topicPillY}
        width="1040"
        height={topicPillHeight}
        rx={topicPillHeight / 2}
        fill={PALETTE.cyan}
        fillOpacity={0.07}
        stroke={PALETTE.cyan}
        strokeOpacity={0.34}
      />
      <text
        x="800"
        y={topicBaselines[0]}
        textAnchor="middle"
        fill={PALETTE.cyan}
        fontFamily={DISPLAY_FONT}
        fontSize={topicFontSize}
        fontWeight="700"
        letterSpacing="0.4"
      >
        {topicBaselines.map((baseline, index) => (
          <tspan key={`${topicFit.lines[index]}-${baseline}`} x="800" y={baseline}>
            {topicFit.lines[index]}
          </tspan>
        ))}
      </text>

      {/* ================= METADATA ================= */}
      <g>
        <text
          x="118"
          y="692"
          fill={PALETTE.white}
          fillOpacity={0.5}
          fontFamily={DISPLAY_FONT}
          fontSize="11.5"
          fontWeight="700"
          letterSpacing="3.2"
        >
          SKOR AKHIR
        </text>
        <text
          x="118"
          y="742"
          fill="url(#cert-gold)"
          fontFamily={DISPLAY_FONT}
          fontSize="54"
          fontWeight="800"
        >
          {safeScore}
        </text>
        <text
          x={118 + (safeScore >= 100 ? 92 : safeScore >= 10 ? 64 : 34)}
          y="740"
          fill={PALETTE.white}
          fillOpacity={0.5}
          fontFamily={DISPLAY_FONT}
          fontSize="18"
          fontWeight="500"
        >
          {`/ ${maxScore}`}
        </text>
        <rect
          x="118"
          y="756"
          width={progressWidth}
          height="6"
          rx="3"
          fill={PALETTE.white}
          fillOpacity={0.1}
        />
        <rect
          x="118"
          y="756"
          width={progressWidth * scoreRatio}
          height="6"
          rx="3"
          fill="url(#cert-cyan)"
        />
        <g transform="translate(118 782)">
          <path
            d="M9 0 0 4.5 9 9"
            fill="none"
            stroke={PALETTE.cyan}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(-1 1)"
          />
          <circle cx="9" cy="5.5" r="7" fill="none" stroke={PALETTE.cyan} strokeWidth="1.2" />
          <path
            d="m6 5.5 2 2 4-4"
            fill="none"
            stroke={PALETTE.cyan}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <text
          x="142"
          y="792"
          fill={PALETTE.cyan}
          fontFamily={DISPLAY_FONT}
          fontSize="11"
          fontWeight="700"
          letterSpacing="2.2"
        >
          SUCCESSFULLY COMPLETED
        </text>
        {xp > 0 && (
          <text
            x="118"
            y="814"
            fill={PALETTE.gold}
            fontFamily={DISPLAY_FONT}
            fontSize="11"
            fontWeight="600"
            letterSpacing="1.4"
          >
            +{new Intl.NumberFormat("id-ID").format(xp)} XP DIPEROLEH
          </text>
        )}
      </g>

      <g>
        <text
          x="548"
          y="692"
          fill={PALETTE.white}
          fillOpacity={0.5}
          fontFamily={DISPLAY_FONT}
          fontSize="11.5"
          fontWeight="700"
          letterSpacing="3.2"
        >
          TANGGAL TERBIT
        </text>
        <text
          x="548"
          y="724"
          fill={PALETTE.white}
          fontFamily={DISPLAY_FONT}
          fontSize="22"
          fontWeight="600"
        >
          {formatCertificateDate(issuedAt)}
        </text>
        <text
          x="548"
          y="762"
          fill={PALETTE.white}
          fillOpacity={0.5}
          fontFamily={DISPLAY_FONT}
          fontSize="11.5"
          fontWeight="700"
          letterSpacing="3.2"
        >
          ID SERTIFIKAT
        </text>
        <text
          x="548"
          y="790"
          fill={PALETTE.cyan}
          fontFamily={MONO_FONT}
          fontSize="17"
          fontWeight="600"
          letterSpacing="0.8"
        >
          {code}
        </text>
      </g>

      {/* QR & tanda tangan */}
      <QrCode qr={qr} x={1112} y={638} size={136} />
      <text
        x="1180"
        y="806"
        textAnchor="middle"
        fill={PALETTE.cyan}
        fontFamily={DISPLAY_FONT}
        fontSize="9"
        fontWeight="700"
        letterSpacing="2.4"
      >
        SCAN UNTUK VERIFIKASI
      </text>
      <text
        x="1180"
        y="822"
        textAnchor="middle"
        fill={PALETTE.white}
        fillOpacity={0.38}
        fontFamily={DISPLAY_FONT}
        fontSize="8.5"
      >
        {verificationHost}
      </text>

      <g>
        <text
          x="1292"
          y="714"
          textAnchor="middle"
          fill="url(#cert-gold)"
          fontFamily={SERIF_FONT}
          fontSize="31"
          fontStyle="italic"
          letterSpacing="0.8"
        >
          VisualMath AI
        </text>
        <line x1="1292" y1="736" x2="1470" y2="736" stroke={PALETTE.white} strokeOpacity={0.35} />
        <text
          x="1292"
          y="758"
          textAnchor="middle"
          fill={PALETTE.white}
          fillOpacity={0.62}
          fontFamily={DISPLAY_FONT}
          fontSize="8.5"
          fontWeight="700"
          letterSpacing="1.5"
        >
          VISUALMATH AI LEARNING SYSTEM
        </text>
        <text
          x="1292"
          y="778"
          textAnchor="middle"
          fill={PALETTE.white}
          fillOpacity={0.38}
          fontFamily={DISPLAY_FONT}
          fontSize="8.5"
        >
          Diterbitkan secara digital
        </text>
      </g>

      <line x1="260" y1="842" x2="1340" y2="842" stroke={PALETTE.electric} strokeOpacity={0.2} />
      <text
        x="800"
        y="861"
        textAnchor="middle"
        fill={PALETTE.white}
        fillOpacity={0.34}
        fontFamily={DISPLAY_FONT}
        fontSize="9.5"
        letterSpacing="0.5"
      >
        Dokumen ini diterbitkan otomatis oleh VisualMath AI Learning System dan dapat diverifikasi
        melalui QR code.
      </text>
    </svg>
  );
}
