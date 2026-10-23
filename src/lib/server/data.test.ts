import { beforeEach, describe, expect, it, vi } from "vitest";
import { listProgress, listTopics, listUsers } from "@/lib/db/store";
import { getKelasRoster } from "@/lib/server/data";
import type { Kelas, KelasId, Progress, Topic, TopicId, User, UserId } from "@/lib/types";

/* Lapisan data diuji dengan store DB dimock — tanpa koneksi PostgreSQL. */
vi.mock("@/lib/db/store", () => ({
  getKelasById: vi.fn(),
  getUserById: vi.fn(),
  listCertificatesForUser: vi.fn(),
  listHistory: vi.fn(),
  listHistoryByUser: vi.fn(),
  listKelas: vi.fn(),
  listLogs: vi.fn(),
  listMaterials: vi.fn(),
  listProgress: vi.fn(),
  listQuestions: vi.fn(),
  listTopics: vi.fn(),
  listUsers: vi.fn(),
  startOfToday: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

const USER_ID = "u-1" as UserId;
const DOSEN_ID = "u-dosen" as UserId;
const TOPIC_ID = "t-1" as TopicId;
const TOPIC_ID_2 = "t-2" as TopicId;

function makeUser(): User {
  return {
    id: USER_ID,
    name: "Budi Santoso",
    email: "budi@kampus.id",
    password: "hash",
    role: "mahasiswa",
    nim: "V3925001",
    color: "--color-primary",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeTopic(id: TopicId = TOPIC_ID, order = 1): Topic {
  return {
    id,
    slug: `topik-${order}`,
    title: `Topik ${order}`,
    subtitle: "Dasar aljabar",
    description: "Topik aljabar dasar",
    icon: "calculator",
    color: "primary",
    formulaCount: 3,
    questionCount: 5,
    order,
  };
}

function makeProgress(partial: Partial<Progress> = {}): Progress {
  return {
    userId: USER_ID,
    topicId: TOPIC_ID,
    mastery: 0.2,
    attempts: 3,
    solved: 2,
    xp: 50,
    updatedAt: "2026-02-01T10:00:00.000Z",
    ...partial,
  };
}

function makeKelas(mahasiswaIds: UserId[] = [USER_ID]): Kelas {
  return {
    id: "k-1" as KelasId,
    kode: "K1",
    nama: "Kelas 1",
    dosenId: DOSEN_ID,
    mahasiswaIds,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("server data — roster kelas", () => {
  beforeEach(() => {
    vi.mocked(listUsers).mockReset();
    vi.mocked(listProgress).mockReset();
    vi.mocked(listTopics).mockReset();
    vi.mocked(listUsers).mockResolvedValue([makeUser()]);
    vi.mocked(listTopics).mockResolvedValue([makeTopic(), makeTopic(TOPIC_ID_2, 2)]);
  });

  it("menghitung rata-rata mastery, xp, dan aktivitas terakhir mahasiswa", async () => {
    vi.mocked(listProgress).mockResolvedValue([
      makeProgress({ mastery: 0.2, xp: 50, updatedAt: "2026-02-01T10:00:00.000Z" }),
      makeProgress({
        topicId: TOPIC_ID_2,
        mastery: 0.4,
        xp: 70,
        updatedAt: "2026-03-05T10:00:00.000Z",
      }),
    ]);

    const roster = await getKelasRoster(makeKelas());

    expect(roster).toHaveLength(1);
    const row = roster[0];
    expect(row.user.email).toBe("budi@kampus.id");
    expect(row.avg).toBeCloseTo(0.3, 5);
    expect(row.xp).toBe(120);
    expect(row.rows).toHaveLength(2);
    // Aktivitas terakhir = progres paling baru, bukan yang paling lama.
    expect(row.lastActive).toBe("2026-03-05T10:00:00.000Z");
  });

  it("memakai createdAt user saat mahasiswa belum punya progres", async () => {
    vi.mocked(listProgress).mockResolvedValue([]);

    const roster = await getKelasRoster(makeKelas());

    expect(roster).toHaveLength(1);
    expect(roster[0].avg).toBe(0);
    expect(roster[0].xp).toBe(0);
    expect(roster[0].rows).toHaveLength(0);
    expect(roster[0].lastActive).toBe("2026-01-01T00:00:00.000Z");
  });

  it("membuang mahasiswa yang tidak ditemukan di daftar user", async () => {
    vi.mocked(listProgress).mockResolvedValue([makeProgress()]);

    const roster = await getKelasRoster(makeKelas(["u-hilang" as UserId]));

    expect(roster).toHaveLength(0);
  });
});
