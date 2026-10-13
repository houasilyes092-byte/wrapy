export async function uploadFile(endpoint: string, file: File, signal?: AbortSignal) {
  const ticketResponse = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: file.type, size: file.size }),
    signal,
  });
  const ticket = await ticketResponse.json().catch(() => null);

  if (!ticketResponse.ok || !ticket?.success) {
    throw new Error(ticket?.error || "Upload could not be started.");
  }

  if (ticket.mode === "local") {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(endpoint, { method: "POST", body: form, signal });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success || typeof result.url !== "string") {
      throw new Error(result?.error || "Upload failed.");
    }
    return result.url as string;
  }

  if (typeof ticket.signedUrl !== "string" || typeof ticket.url !== "string" || !ticket.headers) {
    throw new Error("The upload service returned an invalid upload ticket.");
  }

  const uploadResponse = await fetch(ticket.signedUrl, {
    method: "PUT",
    headers: ticket.headers,
    body: file,
    signal,
  });
  if (!uploadResponse.ok) {
    throw new Error("Supabase Storage could not save the uploaded file.");
  }

  return ticket.url as string;
}
