"use client";

import { useState } from "react";
import Image from "next/image";
import { uploadFile } from "@/lib/upload-client";

interface AccountProfileProps {
  initialName: string;
  initialPhone: string | null;
  initialAvatar: string | null;
}

export default function AccountProfile({ initialName, initialPhone, initialAvatar }: AccountProfileProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone || "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const avatarSrc = avatarUrl.startsWith("private-avatar://") ? "/api/account/avatar" : avatarUrl;
  const field = "w-full rounded-xl border border-dark-border bg-dark px-4 py-3 text-sm text-white";

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, avatarUrl }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update profile.");
      setMessage("Profil mis à jour.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      setAvatarUrl(await uploadFile("/api/account/avatar", file));
      setMessage("Photo ajoutée. Enregistrez le profil pour valider.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur réseau.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update password.");
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Mot de passe modifié.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-8 grid gap-5 md:grid-cols-2">
      <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-dark-border bg-dark-card p-5">
        <h2 className="text-lg font-semibold text-white">Mon profil</h2>
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <Image src={avatarSrc} alt="Photo de profil" width={64} height={64} unoptimized className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-dark text-xl text-brand" aria-hidden="true">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <label className="cursor-pointer text-sm text-brand">
            Changer la photo
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} className="sr-only" />
          </label>
        </div>
        <label className="block text-sm text-dark-muted">
          Nom
          <input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className={field} />
        </label>
        <label className="block text-sm text-dark-muted">
          Téléphone
          <input value={phone} onChange={(event) => setPhone(event.target.value)} className={field} />
        </label>
        <button disabled={busy} className="min-h-11 rounded-xl bg-brand px-5 font-semibold text-black disabled:opacity-50">
          Enregistrer le profil
        </button>
      </form>

      <form onSubmit={changePassword} className="space-y-4 rounded-2xl border border-dark-border bg-dark-card p-5">
        <h2 className="text-lg font-semibold text-white">Changer le mot de passe</h2>
        <label className="block text-sm text-dark-muted">
          Mot de passe actuel
          <input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={field} />
        </label>
        <label className="block text-sm text-dark-muted">
          Nouveau mot de passe
          <input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={field} />
        </label>
        <button disabled={busy} className="min-h-11 rounded-xl border border-dark-border px-5 font-semibold text-white disabled:opacity-50">
          Mettre à jour
        </button>
      </form>
      {message && <p role="status" className="text-sm text-brand md:col-span-2">{message}</p>}
    </section>
  );
}
