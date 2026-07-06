"use client";
import * as React from "react";
import { useTheme } from "next-themes";
import { Settings2, User, Lock, Palette, Database, Trash2, Download, Moon, Sun, Monitor } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/store/auth";
import { useToast } from "@/lib/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm/ConfirmDialog";

export default function ConfiguracoesPage() {
  const user = useAuth((s) => s.user);
  const refresh = useAuth((s) => s.refresh);
  const logout = useAuth((s) => s.logout);
  const toast = useToast();
  const { theme, setTheme } = useTheme();

  // Display name
  const [displayName, setDisplayName] = React.useState(user?.display_name ?? "");
  const [savingName, setSavingName] = React.useState(false);

  React.useEffect(() => {
    setDisplayName(user?.display_name ?? "");
  }, [user?.display_name]);

  async function handleSaveName() {
    if (displayName.trim() === "") {
      toast.warning("Nome vazio", "Digite um nome de exibição.");
      return;
    }
    setSavingName(true);
    try {
      const r = await fetch("/api/auth/me-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Erro");
      toast.success("Nome atualizado", `Você agora se chama "${d.user.display_name}".`);
      refresh();
    } catch (err) {
      toast.error("Erro ao atualizar nome", err instanceof Error ? err.message : "Tente novamente.");
    } finally {
      setSavingName(false);
    }
  }

  // Password
  const [currentPwd, setCurrentPwd] = React.useState("");
  const [newPwd, setNewPwd] = React.useState("");
  const [newPwdConfirm, setNewPwdConfirm] = React.useState("");
  const [savingPwd, setSavingPwd] = React.useState(false);

  async function handleChangePassword() {
    if (newPwd.length < 6) {
      toast.warning("Senha muito curta", "Mínimo de 6 caracteres.");
      return;
    }
    if (newPwd !== newPwdConfirm) {
      toast.warning("Confirmação não bate", "As senhas novas não são iguais.");
      return;
    }
    setSavingPwd(true);
    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Erro");
      toast.success("Senha alterada", "Use a nova senha no próximo login.");
      setCurrentPwd("");
      setNewPwd("");
      setNewPwdConfirm("");
    } catch (err) {
      toast.error("Não foi possível trocar a senha", err instanceof Error ? err.message : "Tente novamente.");
    } finally {
      setSavingPwd(false);
    }
  }

  // Delete account
  const [confirmEmail, setConfirmEmail] = React.useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [deletingAccount, setDeletingAccount] = React.useState(false);

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    try {
      const r = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm_email: confirmEmail }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Erro");
      toast.success("Conta deletada", "Seus dados foram removidos.");
      await logout();
      window.location.href = "/";
    } catch (err) {
      toast.error("Erro ao deletar conta", err instanceof Error ? err.message : "Tente novamente.");
      setDeletingAccount(false);
      setConfirmDeleteOpen(false);
    }
  }

  if (!user) {
    return (
      <div className="px-6 py-10 md:px-10 md:py-12">
        <div className="mx-auto max-w-[1100px]">
          <h1 className="text-h1 text-neutral-900 mb-1">Configurações</h1>
          <p className="text-body text-neutral-600">Você precisa estar logado para acessar configurações.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10 md:px-10 md:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-h1 text-neutral-900 mb-1 flex items-center gap-2">
            <Settings2 className="h-6 w-6" />
            Configurações
          </h1>
          <p className="text-body text-neutral-600">Preferências, conta e privacidade</p>
        </div>

        {/* Conta */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-h4 font-semibold">
              <User className="h-5 w-5 text-primary" />
              Conta
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <Input value={user.email ?? ""} disabled className="bg-muted" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Nome de exibição</label>
              <div className="flex gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Como você quer ser chamado?"
                  maxLength={80}
                />
                <Button onClick={handleSaveName} disabled={savingName}>
                  {savingName ? "Salvando..." : "Salvar"}
                </Button>
              </div>
              <p className="text-caption text-muted-foreground mt-1">
                Aparece nas saudações do Naninne e nas referências.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Senha */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-h4 font-semibold">
              <Lock className="h-5 w-5 text-primary" />
              Senha
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Senha atual</label>
                <Input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nova senha</label>
                  <Input
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Confirmar</label>
                  <Input
                    type="password"
                    value={newPwdConfirm}
                    onChange={(e) => setNewPwdConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <Button onClick={handleChangePassword} disabled={savingPwd || !currentPwd || !newPwd}>
                {savingPwd ? "Trocando..." : "Trocar senha"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Aparência */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-h4 font-semibold">
              <Palette className="h-5 w-5 text-primary" />
              Aparência
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tema</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={
                    "flex flex-col items-center gap-1.5 p-3 rounded-md border text-sm transition-colors " +
                    (theme === "light" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")
                  }
                >
                  <Sun className="h-5 w-5" />
                  Claro
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={
                    "flex flex-col items-center gap-1.5 p-3 rounded-md border text-sm transition-colors " +
                    (theme === "dark" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")
                  }
                >
                  <Moon className="h-5 w-5" />
                  Escuro
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={
                    "flex flex-col items-center gap-1.5 p-3 rounded-md border text-sm transition-colors " +
                    (theme === "system" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")
                  }
                >
                  <Monitor className="h-5 w-5" />
                  Sistema
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-h4 font-semibold">
              <Database className="h-5 w-5 text-primary" />
              Seus dados
            </div>
            <p className="text-sm text-neutral-600">
              Baixe uma cópia de todas as suas conversas, mensagens, documentos, biblioteca, notas e memórias. Arquivo em JSON.
            </p>
            <a
              href="/api/auth/export-data"
              download
              className="inline-flex items-center gap-2 px-4 h-10 rounded-md border border-neutral-300 bg-white hover:bg-neutral-100 text-sm font-medium"
            >
              <Download className="h-4 w-4" />
              Baixar meus dados (.json)
            </a>
          </CardContent>
        </Card>

        {/* Zona de perigo */}
        <Card className="border-red-200">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-h4 font-semibold text-red-700">
              <Trash2 className="h-5 w-5" />
              Zona de perigo
            </div>
            <p className="text-sm text-neutral-600">
              Deletar sua conta remove <strong>todas</strong> as suas conversas, mensagens, biblioteca, notas, memórias, documentos gerados e cenas. Esta ação <strong>não pode ser desfeita</strong>.
            </p>
            <Button variant="danger" onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              Deletar minha conta permanentemente
            </Button>
          </CardContent>
        </Card>

        <ConfirmDialog
          open={confirmDeleteOpen}
          onClose={() => {
            setConfirmDeleteOpen(false);
            setConfirmEmail("");
          }}
          onConfirm={handleDeleteAccount}
          title="Deletar conta?"
          description="Esta ação não pode ser desfeita. Todos os seus dados serão removidos e a sessão será encerrada."
          confirmText="Sim, deletar minha conta"
          confirmPhrase={user.email ?? undefined}
          loading={deletingAccount}
        />
      </div>
    </div>
  );
}
