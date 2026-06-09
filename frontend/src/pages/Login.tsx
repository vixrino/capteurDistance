import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/api/client";
import { useAuthStore } from "@/store/authStore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto py-10 animate-rise">
      <span className="eyebrow">Accès membre</span>
      <h1 className="font-serif text-5xl text-ink mt-3 leading-none">Connexion</h1>
      <p className="text-sm text-ink-muted mt-3">
        Retrouvez votre dashboard et vos scores.
      </p>

      {error && (
        <p className="mt-6 text-sm text-clay font-serif italic border-l-2 border-clay pl-3">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-7">
        <div>
          <label className="text-[11px] tracking-[0.14em] uppercase text-ink-faint">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="field mt-1"
            placeholder="toi@isep.fr"
          />
        </div>
        <div>
          <label className="text-[11px] tracking-[0.14em] uppercase text-ink-faint">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="field mt-1"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-ink w-full">
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <p className="text-sm text-ink-muted mt-8 text-center">
        Pas encore de compte ?{" "}
        <Link to="/register" className="text-clay underline decoration-line underline-offset-4 hover:decoration-clay">
          S'inscrire
        </Link>
      </p>
    </div>
  );
}
