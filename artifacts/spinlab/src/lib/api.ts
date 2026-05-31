const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Deals ──────────────────────────────────────────────────────────────────

export const getDeletedDeals = () => apiFetch("/api/deals/deleted");
export const getArchivedDeals = () => apiFetch("/api/deals/archived");

export const softDeleteDeal = (id: number) =>
  apiFetch(`/api/deals/${id}`, { method: "DELETE" });

export const archiveDeal = (id: number) =>
  apiFetch(`/api/deals/${id}/archive`, { method: "POST" });

export const restoreDeal = (id: number) =>
  apiFetch(`/api/deals/${id}/restore`, { method: "POST" });

export const permanentlyDeleteDeal = (id: number) =>
  apiFetch(`/api/deals/${id}/permanent`, { method: "DELETE" });

// ── Brokers ────────────────────────────────────────────────────────────────

export const getDeletedBrokers = () => apiFetch("/api/brokers/deleted");
export const getArchivedBrokers = () => apiFetch("/api/brokers/archived");

export const softDeleteBroker = (id: number) =>
  apiFetch(`/api/brokers/${id}`, { method: "DELETE" });

export const archiveBroker = (id: number) =>
  apiFetch(`/api/brokers/${id}/archive`, { method: "POST" });

export const restoreBroker = (id: number) =>
  apiFetch(`/api/brokers/${id}/restore`, { method: "POST" });

export const permanentlyDeleteBroker = (id: number) =>
  apiFetch(`/api/brokers/${id}/permanent`, { method: "DELETE" });

export const getBrokerLinkedDeals = (id: number) =>
  apiFetch(`/api/brokers/${id}/linked-deals`);

export const deleteBrokerUnlink = (id: number) =>
  apiFetch(`/api/brokers/${id}/delete-unlink`, { method: "POST" });

export const deleteBrokerReassign = (id: number, reassignToBrokerId: number) =>
  apiFetch(`/api/brokers/${id}/delete-reassign`, {
    method: "POST",
    body: JSON.stringify({ reassignToBrokerId }),
  });
