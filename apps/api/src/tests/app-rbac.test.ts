import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import type { Actor, Role } from "../lib/authorization/types";
import type {
  DataService,
  PresignService,
  UserEntity,
} from "../lib/services/types";

const IDs = {
  generation: "10000000-0000-4000-8000-000000000001",
  exhibition: "20000000-0000-4000-8000-000000000001",
  member: "30000000-0000-4000-8000-000000000001",
  otherUser: "30000000-0000-4000-8000-000000000002",
  manager: "30000000-0000-4000-8000-000000000003",
} as const;

const createActor = (role: Role, id: string): Actor => ({
  id,
  role,
  rawRole: role,
  name: `${role}-name`,
  email: `${role}@example.com`,
  generationId: null,
});

const createUser = (id: string): UserEntity => ({
  id,
  name: "tester",
  email: "tester@example.com",
  image: null,
  nickname: null,
  role: "member",
  generationId: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

const createDataServiceMock = (overrides: Partial<DataService> = {}): DataService => {
  return new Proxy(overrides as DataService, {
    get(target, prop) {
      if (prop in target) {
        return target[prop as keyof DataService];
      }
      return async () => {
        throw new Error(`Unexpected DataService call: ${String(prop)}`);
      };
    },
  }) as DataService;
};

const createPresignServiceMock = (
  overrides: Partial<PresignService> = {},
): PresignService => {
  return new Proxy(overrides as PresignService, {
    get(target, prop) {
      if (prop in target) {
        return target[prop as keyof PresignService];
      }
      return async () => {
        throw new Error(`Unexpected PresignService call: ${String(prop)}`);
      };
    },
  }) as PresignService;
};

const createTestApp = (input: {
  actor: Actor | null;
  dataService?: DataService;
  presignService?: PresignService;
}) => {
  return createApp({
    resolveActor: async () => input.actor,
    getDataService: () => input.dataService ?? createDataServiceMock(),
    getPresignService: () => input.presignService ?? createPresignServiceMock(),
  });
};

describe("RBAC routes", () => {
  it("미로그인 요청은 401을 반환한다", async () => {
    const app = createTestApp({ actor: null });
    const response = await app.request("/api/generations");
    expect(response.status).toBe(401);
  });

  it("부회장은 generation 삭제가 불가하다", async () => {
    const app = createTestApp({
      actor: createActor("vice_president", IDs.member),
    });

    const response = await app.request(`/api/generations/${IDs.generation}`, {
      method: "DELETE",
    });
    expect(response.status).toBe(403);
  });

  it("회장은 generation 삭제가 가능하다", async () => {
    const deleteGeneration = vi.fn(async () => true);
    const app = createTestApp({
      actor: createActor("president", IDs.member),
      dataService: createDataServiceMock({
        deleteGeneration,
      }),
    });

    const response = await app.request(`/api/generations/${IDs.generation}`, {
      method: "DELETE",
    });
    expect(response.status).toBe(204);
    expect(deleteGeneration).toHaveBeenCalledWith(IDs.generation);
  });

  it("부장은 exhibition 삭제가 불가하다", async () => {
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
    });

    const response = await app.request(`/api/exhibitions/${IDs.exhibition}`, {
      method: "DELETE",
    });
    expect(response.status).toBe(403);
  });

  it("부원의 users 목록 조회는 본인 1건만 반환한다", async () => {
    const getUserById = vi.fn(async (id: string) => createUser(id));
    const app = createTestApp({
      actor: createActor("member", IDs.member),
      dataService: createDataServiceMock({
        getUserById,
      }),
    });

    const response = await app.request("/api/users");
    expect(response.status).toBe(200);

    const body = (await response.json()) as { data: UserEntity[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe(IDs.member);
    expect(getUserById).toHaveBeenCalledWith(IDs.member);
  });

  it("부원은 다른 사용자 상세 조회가 불가하다", async () => {
    const app = createTestApp({
      actor: createActor("member", IDs.member),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`);
    expect(response.status).toBe(403);
  });

  it("부원은 본인 상세 조회가 가능하다", async () => {
    const app = createTestApp({
      actor: createActor("member", IDs.member),
      dataService: createDataServiceMock({
        getUserById: vi.fn(async () => createUser(IDs.member)),
      }),
    });

    const response = await app.request(`/api/users/${IDs.member}`);
    expect(response.status).toBe(200);
  });

  it("부원은 본인 프로필(name/nickname/image)만 수정 가능하다", async () => {
    const updateUser = vi.fn(async () => createUser(IDs.member));
    const app = createTestApp({
      actor: createActor("member", IDs.member),
      dataService: createDataServiceMock({
        updateUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.member}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "updated-name",
      }),
    });

    expect(response.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith(IDs.member, {
      name: "updated-name",
    });
  });

  it("부원은 role/generationId를 수정할 수 없다", async () => {
    const app = createTestApp({
      actor: createActor("member", IDs.member),
    });

    const response = await app.request(`/api/users/${IDs.member}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        role: "president",
      }),
    });

    expect(response.status).toBe(400);
  });

  it("부원은 본인 계정 삭제(탈퇴)가 가능하다", async () => {
    const deleteUser = vi.fn(async () => true);
    const app = createTestApp({
      actor: createActor("member", IDs.member),
      dataService: createDataServiceMock({
        deleteUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.member}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(deleteUser).toHaveBeenCalledWith(IDs.member);
  });

  it("부원은 activities 생성이 불가하다", async () => {
    const app = createTestApp({
      actor: createActor("member", IDs.member),
    });

    const response = await app.request("/api/activities", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "t",
        description: "d",
        activityDate: Date.now(),
        coverImageUrl: "https://example.com/a.jpg",
        generationId: IDs.generation,
      }),
    });

    expect(response.status).toBe(403);
  });

  it("부장은 사용자 프로필 presign 발급이 불가하다", async () => {
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
    });

    const response = await app.request("/api/users/presign/profile", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fileName: "profile.png",
        contentType: "image/png",
      }),
    });

    expect(response.status).toBe(403);
  });

  it("부장은 activities presign 발급이 가능하다", async () => {
    const issuePresignedPutUrl = vi.fn(async () => ({
      uploadUrl: "https://upload.example.com/signed",
      objectKey: "activities/key.png",
      publicUrl: "https://cdn.example.com/activities/key.png",
      requiredHeaders: {
        "Content-Type": "image/png",
      },
    }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({
        issuePresignedPutUrl,
      }),
    });

    const response = await app.request("/api/activities/presign/cover", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fileName: "cover.png",
        contentType: "image/png",
      }),
    });

    expect(response.status).toBe(201);
    expect(issuePresignedPutUrl).toHaveBeenCalledWith({
      actorId: IDs.manager,
      resource: "activities",
      slot: "cover",
      fileName: "cover.png",
      contentType: "image/png",
    });
  });
});
