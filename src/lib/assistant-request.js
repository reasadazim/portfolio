export async function assistantRequest(action, csrf, details = {}, signal) {
  const response = await fetch("api/assistant.php", {
    method: action ? "POST" : "GET",
    credentials: "same-origin",
    headers: action ? { "Content-Type": "application/json" } : {},
    body: action ? JSON.stringify({ ...details, action, csrf }) : undefined,
    signal,
  });
  const type = response.headers.get("content-type") || "";
  if (!type.includes("application/json"))
    throw new Error(
      "The contact service is temporarily unavailable. Please email Reasad directly.",
    );
  const result = await response.json();
  if (!response.ok) {
    const failure = new Error(result.error || "Please try again in a moment.");
    failure.status = response.status;
    throw failure;
  }
  return result;
}
