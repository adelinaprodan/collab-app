type RequestOptions = {
  body?: Record<string, unknown>;
  method: "GET" | "POST" | "PATCH" | "DELETE";
};

export type ApiResponse<T> = {
  data: T;
  ok: boolean;
  status: number;
};

async function request<T>(
  path: string,
  options: RequestOptions
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(path, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Debug
  console.log(
    "API",
    options.method,
    path,
    "status",
    res.status,
    "token?",
    Boolean(token)
  );

  // Don't force logout on every 401 (or your UI will "flash")
  if (res.status === 401) {
    console.warn("401 Unauthorized from", path);

    // Only force logout if it's an endpoint that proves the session is invalid
    const shouldLogout =
      path.includes("/api/users/me") || path.includes("/api/auth/me");

    if (shouldLogout) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  }

  const data = (await res.json().catch(() => ({}))) as T;
  return { data, ok: res.ok, status: res.status };
}

export function apiGet<T>(path: string) {
  return request<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body?: Record<string, unknown>) {
  return request<T>(path, { method: "POST", body });
}

export function apiPatch<T>(path: string, body?: Record<string, unknown>) {
  return request<T>(path, { method: "PATCH", body });
}

export function apiDelete<T>(path: string, body?: Record<string, unknown>) {
  return request<T>(path, { method: "DELETE", body });
}
