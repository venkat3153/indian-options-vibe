export type PermissionAuditEvent = {
  id: string;
  createdAt: string;
  type:
    | "FULL_MODEL_REFRESH"
    | "SYSTEM_READY"
    | "SYSTEM_BLOCK"
    | "EMERGENCY_LOCK"
    | "CANDIDATE_CLEARED";
  message: string;
};

export const PERMISSION_AUDIT_KEY = "indian-options-vibe:permission-audit:v1";

export function loadPermissionAudit(): PermissionAuditEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PERMISSION_AUDIT_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addPermissionAudit(type: PermissionAuditEvent["type"], message: string) {
  if (typeof window === "undefined") return;

  const event: PermissionAuditEvent = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    type,
    message,
  };

  const current = loadPermissionAudit();
  const next = [event, ...current].slice(0, 50);

  window.localStorage.setItem(PERMISSION_AUDIT_KEY, JSON.stringify(next));
}

export function clearPermissionAudit() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PERMISSION_AUDIT_KEY);
}
