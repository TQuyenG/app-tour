/**
 * constants/app-accounts.ts
 *
 * Hệ thống tài khoản local (AsyncStorage):
 *  - Đăng ký tài khoản mới, lưu @app_accounts
 *  - Đăng nhập: so khớp email/password, lưu session @app_current_user
 *  - Dual role: một user có thể có roles: ["guest"] | ["guide"] | ["guest","guide"]
 *  - Guest đăng ký làm HDV → ghi @pending_guide_requests → Admin duyệt
 *  - Guide edit profile → sync ngược vào @app_guides để guest trang chủ thấy
 *  - Switch role: guide tạm dừng/kích hoạt lại
 *
 * AsyncStorage keys:
 *   @app_accounts         – danh sách tài khoản
 *   @app_current_user     – session đang đăng nhập
 *   @pending_guide_requests – yêu cầu nâng cấp lên HDV chờ admin duyệt
 *   @app_guides           – guide list hiển thị cho guest (sync từ profile)
 *   @app_profile          – profile guest hiện tại
 *   @guide_profile        – profile guide hiện tại
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type UserRole = "guest" | "guide" | "admin" | "staff";
export type UserStatus = "active" | "pending" | "suspended";
export type GuideStatus = "active" | "busy" | "inactive" | "paused";

export interface AppAccount {
  id: string;
  email: string;
  password: string; // plain text trong demo – thực tế phải hash
  name: string;
  phone: string;
  roles: UserRole[]; // ["guest"] | ["guide"] | ["guest","guide"]
  activeRole: UserRole; // role đang dùng hiện tại
  status: UserStatus;
  createdAt: string;
  avatarColor?: string;
  // Guide fields (chỉ có khi roles bao gồm "guide")
  guideStatus?: GuideStatus; // active/paused/busy
  guideId?: string; // id trong @app_guides
}

export interface CurrentUser {
  accountId: string;
  activeRole: UserRole;
  name: string;
  email: string;
  phone: string;
  avatarColor?: string;
  guideStatus?: GuideStatus;
  guideId?: string;
}

export interface GuideRequest {
  id: string;
  accountId: string;
  name: string;
  email: string;
  phone: string;
  bio: string;
  skills: string;
  languages: string;
  experience: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  note?: string;
}

// ─────────────────────────────────────────────────────────────
// Seed accounts (hiện ở đây để app có sẵn dữ liệu khi khởi động)
// ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "#4f7cff",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
];

const SEED_ACCOUNTS: AppAccount[] = [
  {
    id: "acc-guest-1",
    email: "guest1@gmail.com",
    password: "123456",
    name: "Nguyễn An",
    phone: "0901 234 567",
    roles: ["guest"],
    activeRole: "guest",
    status: "active",
    createdAt: "2025-01-10T08:00:00Z",
    avatarColor: "#4f7cff",
  },
  {
    id: "acc-admin-1",
    email: "admin1@gmail.com",
    password: "123456",
    name: "Trần Quang Admin",
    phone: "0909 123 456",
    roles: ["admin"],
    activeRole: "admin",
    status: "active",
    createdAt: "2025-01-01T00:00:00Z",
    avatarColor: "#ef4444",
  },
  {
    id: "acc-guide-1",
    email: "guide1@gmail.com",
    password: "123456",
    name: "Nguyễn Văn Hùng",
    phone: "0912 345 678",
    roles: ["guide", "guest"],
    activeRole: "guide",
    status: "active",
    createdAt: "2025-01-05T08:00:00Z",
    avatarColor: "#10b981",
    guideStatus: "active",
    guideId: "g1",
  },
  {
    id: "acc-guide-2",
    email: "guide2@gmail.com",
    password: "123456",
    name: "Trần Thị Lan",
    phone: "0918 765 432",
    roles: ["guide", "guest"],
    activeRole: "guide",
    status: "active",
    createdAt: "2025-01-07T08:00:00Z",
    avatarColor: "#8b5cf6",
    guideStatus: "active",
    guideId: "g2",
  },
  // Guest có cả 2 role (đã được duyệt làm HDV)
  // Guest có cả 2 role (đã được duyệt làm HDV)
  {
    id: "acc-dual-1",
    email: "dual1@gmail.com",
    password: "123456",
    name: "Lê Văn Phong",
    phone: "0933 111 222",
    roles: ["guest", "guide"],
    activeRole: "guest",
    status: "active",
    createdAt: "2025-02-01T08:00:00Z",
    avatarColor: "#06b6d4",
    guideStatus: "paused",
    guideId: "g4",
  },
  // Staff CSKH
  {
    id: "acc-staff-1",
    email: "staff1@gmail.com",
    password: "123456",
    name: "Lê Thị CSKH",
    phone: "0911 000 111",
    roles: ["staff"],
    activeRole: "staff",
    status: "active",
    createdAt: "2025-01-02T00:00:00Z",
    avatarColor: "#f59e0b",
  },
];
// ─────────────────────────────────────────────────────────────
// Keys
// ─────────────────────────────────────────────────────────────
const KEY_ACCOUNTS = "@app_accounts";
const KEY_CURRENT = "@app_current_user";
const KEY_REQUESTS = "@pending_guide_requests";

// ─────────────────────────────────────────────────────────────
// Load / Save accounts
// ─────────────────────────────────────────────────────────────
export async function getAccounts(): Promise<AppAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_ACCOUNTS);
    if (raw) {
      const saved: AppAccount[] = JSON.parse(raw);
      // Merge: giữ accounts user tự tạo, bổ sung seed accounts còn thiếu
      const merged = [...saved];
      for (const seed of SEED_ACCOUNTS) {
        if (
          !merged.find(
            (a) => a.email.toLowerCase() === seed.email.toLowerCase(),
          )
        ) {
          merged.push(seed);
        }
      }
      // Nếu có thay đổi thì lưu lại
      if (merged.length !== saved.length) {
        await AsyncStorage.setItem(KEY_ACCOUNTS, JSON.stringify(merged)).catch(
          () => {},
        );
      }
      return merged;
    }
    // First run: seed
    await AsyncStorage.setItem(KEY_ACCOUNTS, JSON.stringify(SEED_ACCOUNTS));
    return SEED_ACCOUNTS;
  } catch {
    return SEED_ACCOUNTS;
  }
}

async function saveAccounts(list: AppAccount[]): Promise<void> {
  await AsyncStorage.setItem(KEY_ACCOUNTS, JSON.stringify(list)).catch(
    () => {},
  );
}

// ─────────────────────────────────────────────────────────────
// Register
// ─────────────────────────────────────────────────────────────
export type RegisterResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; error: string };

export async function registerAccount(
  name: string,
  email: string,
  phone: string,
  password: string,
): Promise<RegisterResult> {
  const list = await getAccounts();
  if (list.find((a) => a.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: "Email đã được sử dụng." };
  }
  const color = AVATAR_COLORS[list.length % AVATAR_COLORS.length];
  const newAcc: AppAccount = {
    id: `acc-${Date.now()}`,
    email: email.toLowerCase(),
    password,
    name,
    phone,
    roles: ["guest"],
    activeRole: "guest",
    status: "active",
    createdAt: new Date().toISOString(),
    avatarColor: color,
  };
  await saveAccounts([...list, newAcc]);
  const user = accountToCurrentUser(newAcc);
  await saveCurrentUser(user);
  await syncGuestProfile(user);
  return { ok: true, user };
}

// ─────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────
export type LoginResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; error: string };

export async function loginAccount(
  email: string,
  password: string,
): Promise<LoginResult> {
  const list = await getAccounts();
  const acc = list.find(
    (a) =>
      a.email.toLowerCase() === email.toLowerCase() && a.password === password,
  );
  if (!acc) return { ok: false, error: "Email hoặc mật khẩu không chính xác." };
  if (acc.status === "suspended")
    return { ok: false, error: "Tài khoản đã bị tạm khóa." };
  const user = accountToCurrentUser(acc);
  await saveCurrentUser(user);
  if (acc.activeRole === "guest" || acc.roles.includes("guest")) {
    await syncGuestProfile(user);
  }
  return { ok: true, user };
}

// ─────────────────────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────────────────────
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_CURRENT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveCurrentUser(user: CurrentUser): Promise<void> {
  await AsyncStorage.setItem(KEY_CURRENT, JSON.stringify(user)).catch(() => {});
}

export async function logoutAccount(): Promise<void> {
  await AsyncStorage.removeItem(KEY_CURRENT).catch(() => {});
}

// ─────────────────────────────────────────────────────────────
// Switch active role (guest ↔ guide)
// ─────────────────────────────────────────────────────────────
export async function switchRole(
  accountId: string,
  newRole: UserRole,
): Promise<{ ok: boolean; user?: CurrentUser; error?: string }> {
  const list = await getAccounts();
  const idx = list.findIndex((a) => a.id === accountId);
  if (idx < 0) return { ok: false, error: "Không tìm thấy tài khoản." };
  const acc = list[idx];
  if (!acc.roles.includes(newRole))
    return { ok: false, error: `Tài khoản không có quyền ${newRole}.` };
  list[idx] = { ...acc, activeRole: newRole };
  await saveAccounts(list);
  const user = accountToCurrentUser(list[idx]);
  await saveCurrentUser(user);
  return { ok: true, user };
}

// ─────────────────────────────────────────────────────────────
// Guide pause / resume (ảnh hưởng @app_guides visibility)
// ─────────────────────────────────────────────────────────────
export async function setGuideStatus(
  accountId: string,
  status: GuideStatus,
  pauseFromBookings: boolean, // true = ẩn khỏi danh sách guest, false = vẫn hiển thị nhưng đánh dấu bận
): Promise<void> {
  const list = await getAccounts();
  const idx = list.findIndex((a) => a.id === accountId);
  if (idx < 0) return;
  list[idx] = { ...list[idx], guideStatus: status };
  await saveAccounts(list);

  // Sync vào @app_guides
  if (list[idx].guideId) {
    await syncGuideStatusToPublic(
      list[idx].guideId!,
      status,
      pauseFromBookings,
    );
  }
  // Update session
  const user = accountToCurrentUser(list[idx]);
  await saveCurrentUser(user);
}

// ─────────────────────────────────────────────────────────────
// Submit guide request (guest muốn làm HDV)
// ─────────────────────────────────────────────────────────────
export async function submitGuideRequest(
  accountId: string,
  name: string,
  email: string,
  phone: string,
  bio: string,
  skills: string,
  languages: string,
  experience: string,
): Promise<void> {
  const raw = await AsyncStorage.getItem(KEY_REQUESTS).catch(() => null);
  const list: GuideRequest[] = raw ? JSON.parse(raw) : [];
  // Nếu đã có request pending → không cho gửi lại
  const existing = list.find(
    (r) => r.accountId === accountId && r.status === "pending",
  );
  if (existing) return;
  const req: GuideRequest = {
    id: `req-${Date.now()}`,
    accountId,
    name,
    email,
    phone,
    bio,
    skills,
    languages,
    experience,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(
    KEY_REQUESTS,
    JSON.stringify([req, ...list]),
  ).catch(() => {});
}

export async function getPendingGuideRequests(): Promise<GuideRequest[]> {
  const raw = await AsyncStorage.getItem(KEY_REQUESTS).catch(() => null);
  return raw ? JSON.parse(raw) : [];
}

// ─────────────────────────────────────────────────────────────
// Admin: approve / reject guide request
// ─────────────────────────────────────────────────────────────
export async function approveGuideRequest(requestId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(KEY_REQUESTS).catch(() => null);
  const reqs: GuideRequest[] = raw ? JSON.parse(raw) : [];
  const req = reqs.find((r) => r.id === requestId);
  if (!req) return;

  // Update request status
  const updatedReqs = reqs.map((r) =>
    r.id === requestId ? { ...r, status: "approved" as const } : r,
  );
  await AsyncStorage.setItem(KEY_REQUESTS, JSON.stringify(updatedReqs)).catch(
    () => {},
  );

  // Upgrade account roles
  const list = await getAccounts();
  const idx = list.findIndex((a) => a.id === req.accountId);
  if (idx < 0) return;
  const guideId = list[idx].guideId || `g${Date.now()}`;
  const upgraded: AppAccount = {
    ...list[idx],
    roles: list[idx].roles.includes("guide")
      ? list[idx].roles
      : [...list[idx].roles, "guide"],
    guideStatus: "active",
    guideId,
  };
  list[idx] = upgraded;
  await saveAccounts(list);

  // Add to @app_guides so guest home sees this guide
  await addGuideToPublic(guideId, req);
}

export async function rejectGuideRequest(
  requestId: string,
  note?: string,
): Promise<void> {
  const raw = await AsyncStorage.getItem(KEY_REQUESTS).catch(() => null);
  const reqs: GuideRequest[] = raw ? JSON.parse(raw) : [];
  const updated = reqs.map((r) =>
    r.id === requestId ? { ...r, status: "rejected" as const, note } : r,
  );
  await AsyncStorage.setItem(KEY_REQUESTS, JSON.stringify(updated)).catch(
    () => {},
  );
}

// ─────────────────────────────────────────────────────────────
// Guide profile update → sync @app_guides (guest home thấy ngay)
// ─────────────────────────────────────────────────────────────
export async function syncGuideProfileToPublic(
  guideId: string,
  profile: {
    name: string;
    location: string;
    experience: string;
    skills: string;
    bio: string;
    phone: string;
    email: string;
    rating?: number;
    tours?: number;
    match?: number;
  },
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem("@app_guides");
    const list = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((g: any) => g.id === guideId);
    const skillArr = profile.skills
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        name: profile.name,
        location: profile.location,
        experience: profile.experience,
        skills: skillArr,
        phone: profile.phone,
        email: profile.email,
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Guide chưa có trong public list → thêm mới
      list.unshift({
        id: guideId,
        name: profile.name,
        location: profile.location,
        experience: profile.experience,
        skills: skillArr,
        rating: profile.rating ?? 5,
        tours: profile.tours ?? 0,
        match: profile.match ?? 80,
        status: "active",
        phone: profile.phone,
        email: profile.email,
        updatedAt: new Date().toISOString(),
      });
    }
    await AsyncStorage.setItem("@app_guides", JSON.stringify(list)).catch(
      () => {},
    );
  } catch {}
}

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────
function accountToCurrentUser(acc: AppAccount): CurrentUser {
  return {
    accountId: acc.id,
    activeRole: acc.activeRole,
    name: acc.name,
    email: acc.email,
    phone: acc.phone,
    avatarColor: acc.avatarColor,
    guideStatus: acc.guideStatus,
    guideId: acc.guideId,
  };
}

async function syncGuestProfile(user: CurrentUser): Promise<void> {
  const existing = await AsyncStorage.getItem("@app_profile").catch(() => null);
  const old = existing ? JSON.parse(existing) : {};
  await AsyncStorage.setItem(
    "@app_profile",
    JSON.stringify({
      ...old,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarColor: user.avatarColor ?? "#4f7cff",
      loyaltyPoints: old.loyaltyPoints ?? 0,
      loyaltyTier: old.loyaltyTier ?? "Member",
      voucher: old.voucher ?? "",
    }),
  ).catch(() => {});
}

async function syncGuideStatusToPublic(
  guideId: string,
  status: GuideStatus,
  hideFromList: boolean,
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem("@app_guides");
    if (!raw) return;
    const list = JSON.parse(raw);
    const idx = list.findIndex((g: any) => g.id === guideId);
    if (idx < 0) return;
    list[idx] = {
      ...list[idx],
      status: hideFromList ? "inactive" : status === "paused" ? "busy" : status,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem("@app_guides", JSON.stringify(list)).catch(
      () => {},
    );
  } catch {}
}

async function addGuideToPublic(
  guideId: string,
  req: GuideRequest,
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem("@app_guides");
    const list = raw ? JSON.parse(raw) : [];
    if (list.find((g: any) => g.id === guideId)) return; // already exists
    list.unshift({
      id: guideId,
      name: req.name,
      location: "Việt Nam",
      experience: req.experience || "1 năm",
      skills: req.skills
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean),
      rating: 5,
      tours: 0,
      match: 80,
      status: "active",
      phone: req.phone,
      email: req.email,
      updatedAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem("@app_guides", JSON.stringify(list)).catch(
      () => {},
    );
  } catch {}
}
