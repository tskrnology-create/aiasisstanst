"use client";

// Hesap yönetimi: şifre değiştirme, veri dışa aktarma (KVKK taşınabilirlik) ve hesabı kalıcı silme.

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { Button, Callout, Field, SectionCard, inputClass } from "./Ui";

async function listAllFiles(prefix: string, depth = 0): Promise<string[]> {
  if (depth > 4) return [];
  const storage = getSupabase().storage.from("visuals");
  const out: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await storage.list(prefix, { limit: 100, offset });
    if (error || !data || data.length === 0) break;
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id) out.push(path);
      else out.push(...(await listAllFiles(path, depth + 1)));
    }
    if (data.length < 100) break;
  }
  return out;
}

export default function AccountPanel() {
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    void getSupabase()
      .auth.getSession()
      .then(({ data }) => setEmail(data.session?.user.email ?? null));
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (password.length < 6) {
      setPwMsg({ ok: false, text: "Şifre en az 6 karakter olmalı." });
      return;
    }
    setPwBusy(true);
    const { error } = await getSupabase().auth.updateUser({ password });
    setPwBusy(false);
    if (error) {
      setPwMsg({
        ok: false,
        text: /different|same/i.test(error.message)
          ? "Yeni şifre eskisinden farklı olmalı."
          : "Şifre değiştirilemedi. Lütfen çıkış yapıp tekrar giriş yaptıktan sonra deneyin.",
      });
      return;
    }
    setPassword("");
    setPwMsg({ ok: true, text: "Şifreniz güncellendi." });
  }

  async function exportData() {
    setExporting(true);
    setExportMsg(null);
    try {
      const sb = getSupabase();
      const [businesses, accounts, contents, items] = await Promise.all([
        sb.from("businesses").select("*"),
        sb.from("social_accounts").select("*"),
        sb.from("contents").select("*"),
        sb.from("calendar_items").select("*"),
      ]);
      const failed = [businesses, accounts, contents, items].find((r) => r.error);
      if (failed) throw new Error("okunamadı");
      const payload = {
        exported_at: new Date().toISOString(),
        email,
        businesses: businesses.data,
        social_accounts: accounts.data,
        contents: contents.data,
        calendar_items: items.data,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-asisst-verilerim-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportMsg({ ok: true, text: "Verileriniz indirildi." });
    } catch {
      setExportMsg({ ok: false, text: "Veriler indirilemedi. Lütfen daha sonra tekrar deneyin." });
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const sb = getSupabase();
      const { data: businesses, error: listError } = await sb.from("businesses").select("id");
      if (listError) throw new Error("list");
      // Önce özel depodaki dosyalar silinir; hesap silinince erişilemez hale gelirdi.
      for (const b of businesses ?? []) {
        const files = await listAllFiles(b.id as string);
        for (let i = 0; i < files.length; i += 100) {
          const { error } = await sb.storage.from("visuals").remove(files.slice(i, i + 100));
          if (error) throw new Error("storage");
        }
      }
      const { error } = await sb.rpc("delete_my_account");
      if (error) throw new Error(error.code === "PGRST202" ? "missing" : "rpc");
      await sb.auth.signOut();
    } catch (err) {
      setDeleteError(
        err instanceof Error && err.message === "missing"
          ? "Hesap silme özelliği henüz etkinleştirilmemiş. Lütfen destek ile iletişime geçin."
          : "Hesap silinemedi. Hiçbir veri kaybolmadı; lütfen daha sonra tekrar deneyin."
      );
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <SectionCard title="Giriş bilgileri" description={email ? `E-posta: ${email}` : undefined}>
        <form onSubmit={changePassword} className="space-y-4" noValidate>
          <Field label="Yeni şifre" htmlFor="acc-password" hint="En az 6 karakter.">
            <input
              id="acc-password"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {pwMsg && <Callout tone={pwMsg.ok ? "success" : "error"}>{pwMsg.text}</Callout>}
          <Button type="submit" variant="secondary" disabled={pwBusy}>
            {pwBusy ? "Kaydediliyor…" : "Şifreyi değiştir"}
          </Button>
        </form>
      </SectionCard>

      <SectionCard
        title="Verilerim"
        description="Markalarınızı, içeriklerinizi ve takvim kayıtlarınızı JSON dosyası olarak indirin."
      >
        <div className="space-y-3">
          {exportMsg && <Callout tone={exportMsg.ok ? "success" : "error"}>{exportMsg.text}</Callout>}
          <Button variant="secondary" onClick={exportData} disabled={exporting}>
            {exporting ? "Hazırlanıyor…" : "Verilerimi indir"}
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Hesabı sil"
        description="Hesabınız, tüm markalarınız, içerikleriniz, görselleriniz ve takvim kayıtlarınız kalıcı olarak silinir. Bu işlem geri alınamaz."
      >
        <div className="space-y-4">
          <Field label='Onaylamak için "SİL" yazın' htmlFor="acc-confirm">
            <input
              id="acc-confirm"
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
            />
          </Field>
          {deleteError && <Callout tone="error">{deleteError}</Callout>}
          <Button
            variant="danger"
            onClick={deleteAccount}
            disabled={deleting || confirm.trim().toLocaleUpperCase("tr-TR") !== "SİL"}
          >
            {deleting ? "Siliniyor…" : "Hesabımı kalıcı olarak sil"}
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
