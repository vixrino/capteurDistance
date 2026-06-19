import { useEffect, useState, useCallback } from "react";
import api from "@/api/client";
import { Actuator, AlertRule, AlertEvent } from "@/types";

const TYPE_LABEL: Record<Actuator["type"], string> = {
  led: "LED", buzzer: "Buzzer", relais: "Relais", moteur: "Moteur",
};

export default function Manage() {
  const [actuators, setActuators] = useState<Actuator[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [mailConfigured, setMailConfigured] = useState(false);

  const loadActuators = useCallback(() => {
    api.get<Actuator[]>("/actuators").then(({ data }) => setActuators(data)).catch(() => {});
  }, []);
  const loadAlerts = useCallback(() => {
    api.get<AlertRule[]>("/alerts").then(({ data }) => setAlerts(data)).catch(() => {});
  }, []);
  const loadEvents = useCallback(() => {
    api.get<AlertEvent[]>("/alerts/events?limit=15").then(({ data }) => setEvents(data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadActuators();
    loadAlerts();
    loadEvents();
    api.get<{ mail_configured: boolean }>("/alerts/config")
      .then(({ data }) => setMailConfigured(data.mail_configured))
      .catch(() => {});
  }, [loadActuators, loadAlerts, loadEvents]);

  return (
    <div className="animate-rise space-y-16">
      {/* ── Header ── */}
      <header className="pb-6 border-b border-line">
        <span className="eyebrow">Configuration du système</span>
        <h1 className="font-serif text-5xl text-ink mt-3 leading-none">Gestion</h1>
        <p className="text-base text-ink-muted mt-4 max-w-xl">
          Pilotez les actionneurs et définissez les règles d'alerte par e-mail
          déclenchées par les mesures du capteur de distance.
        </p>
      </header>

      <ActuatorSection actuators={actuators} reload={loadActuators} />
      <AlertSection
        alerts={alerts}
        reload={loadAlerts}
        reloadEvents={loadEvents}
        mailConfigured={mailConfigured}
      />
      <EventSection events={events} reload={loadEvents} />
    </div>
  );
}

/* ──────────────────────────── Actionneurs ──────────────────────────── */

function ActuatorSection({ actuators, reload }: { actuators: Actuator[]; reload: () => void }) {
  const [nom, setNom] = useState("");
  const [type, setType] = useState<Actuator["type"]>("led");
  const [sens, setSens] = useState<"below" | "above">("below");
  const [seuil, setSeuil] = useState(20);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!nom.trim()) return;
    setBusy(true);
    try {
      await api.post("/actuators", { nom, type, sens, seuil_cm: seuil, mode: "manuel" });
      setNom("");
      reload();
    } finally { setBusy(false); }
  }

  async function toggle(a: Actuator) {
    await api.post(`/actuators/${a.id}/toggle`);
    reload();
  }
  async function patch(a: Actuator, body: Partial<Actuator>) {
    await api.patch(`/actuators/${a.id}`, body);
    reload();
  }
  async function remove(a: Actuator) {
    await api.delete(`/actuators/${a.id}`);
    reload();
  }

  return (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-3xl text-ink">Actionneurs</h2>
        <span className="eyebrow">{actuators.length} configuré(s)</span>
      </div>

      {/* Création */}
      <form
        className="card p-5 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end"
        aria-label="Ajouter un actionneur"
        onSubmit={(e) => { e.preventDefault(); create(); }}
      >
        <div className="sm:col-span-4">
          <label htmlFor="act-nom" className="eyebrow">Nom</label>
          <input id="act-nom" className="field mt-1" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="LED de proximité" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="act-type" className="eyebrow">Type</label>
          <select id="act-type" className="field mt-1" value={type} onChange={(e) => setType(e.target.value as Actuator["type"])}>
            <option value="led">LED</option>
            <option value="buzzer">Buzzer</option>
            <option value="relais">Relais</option>
            <option value="moteur">Moteur</option>
          </select>
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="act-sens" className="eyebrow">Déclenche si distance</label>
          <select id="act-sens" className="field mt-1" value={sens} onChange={(e) => setSens(e.target.value as "below" | "above")}>
            <option value="below">en dessous du seuil</option>
            <option value="above">au-dessus du seuil</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="act-seuil" className="eyebrow">Seuil (cm)</label>
          <input id="act-seuil" type="number" className="field mt-1" value={seuil} onChange={(e) => setSeuil(Number(e.target.value))} />
        </div>
        <div className="sm:col-span-1">
          <button type="submit" className="btn-ink w-full" disabled={busy} aria-label="Ajouter l'actionneur">+</button>
        </div>
      </form>

      {/* Liste */}
      {actuators.length === 0 ? (
        <p className="text-sm text-ink-faint font-serif italic py-4">Aucun actionneur. Ajoutez-en un ci-dessus.</p>
      ) : (
        <div className="divide-y divide-line border-y border-line">
          {actuators.map((a) => (
            <div key={a.id} className="py-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Etat + nom */}
              <div className="sm:col-span-4 flex items-center gap-3">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${a.etat === "on" ? "bg-moss animate-pulse" : "bg-line"}`}
                  role="img"
                  aria-label={a.etat === "on" ? "Allumé" : "Éteint"}
                />
                <div>
                  <p className="font-serif text-lg text-ink leading-tight">{a.nom}</p>
                  <p className="text-[11px] tracking-[0.14em] uppercase text-ink-faint">{TYPE_LABEL[a.type]}</p>
                </div>
              </div>

              {/* Mode */}
              <div className="sm:col-span-2">
                <select
                  className="field py-1 text-sm"
                  aria-label={`Mode de ${a.nom}`}
                  value={a.mode}
                  onChange={(e) => patch(a, { mode: e.target.value as Actuator["mode"] })}
                >
                  <option value="manuel">Manuel</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              {/* Règle auto */}
              <div className="sm:col-span-4 flex items-center gap-2">
                <select
                  className="field py-1 text-sm"
                  aria-label={`Sens du seuil automatique de ${a.nom}`}
                  value={a.sens}
                  disabled={a.mode !== "auto"}
                  onChange={(e) => patch(a, { sens: e.target.value as "below" | "above" })}
                >
                  <option value="below">si &lt; </option>
                  <option value="above">si &gt; </option>
                </select>
                <input
                  type="number"
                  className="field py-1 text-sm w-20"
                  aria-label={`Seuil automatique de ${a.nom} en centimètres`}
                  value={a.seuil_cm}
                  disabled={a.mode !== "auto"}
                  onChange={(e) => patch(a, { seuil_cm: Number(e.target.value) })}
                />
                <span className="text-xs text-ink-faint">cm</span>
              </div>

              {/* Actions */}
              <div className="sm:col-span-2 flex items-center justify-end gap-3">
                <button
                  onClick={() => toggle(a)}
                  aria-pressed={a.etat === "on"}
                  aria-label={`${a.nom} : ${a.etat === "on" ? "allumé, cliquer pour éteindre" : "éteint, cliquer pour allumer"}`}
                  className={`text-xs px-3 py-1.5 border transition-colors ${
                    a.etat === "on"
                      ? "border-moss text-moss"
                      : "border-line text-ink-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  {a.etat === "on" ? "ON" : "OFF"}
                </button>
                <button onClick={() => remove(a)} aria-label={`Supprimer l'actionneur ${a.nom}`} className="text-ink-faint hover:text-clay transition-colors text-lg leading-none">
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ──────────────────────────── Alertes ──────────────────────────── */

function AlertSection({
  alerts, reload, reloadEvents, mailConfigured,
}: {
  alerts: AlertRule[]; reload: () => void; reloadEvents: () => void; mailConfigured: boolean;
}) {
  const [label, setLabel] = useState("");
  const [comparateur, setComparateur] = useState<"below" | "above">("below");
  const [seuil, setSeuil] = useState(15);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  async function create() {
    if (!label.trim() || !email.trim()) return;
    setBusy(true);
    try {
      await api.post("/alerts", { label, comparateur, seuil_cm: seuil, email });
      setLabel(""); setEmail("");
      reload();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      setTestMsg(err.response?.data?.error || "Erreur création");
    } finally { setBusy(false); }
  }
  async function patch(a: AlertRule, body: Partial<AlertRule>) {
    await api.patch(`/alerts/${a.id}`, body);
    reload();
  }
  async function remove(a: AlertRule) {
    await api.delete(`/alerts/${a.id}`);
    reload();
  }
  async function testEmail() {
    if (!email.trim()) { setTestMsg("Renseigne un e-mail dans le formulaire pour tester."); return; }
    const { data } = await api.post<{ status: string; detail: string }>("/alerts/test", { email });
    setTestMsg(`Test : ${data.status} — ${data.detail}`);
  }
  async function evaluate(distance: number) {
    await api.post("/alerts/evaluate", { distance_cm: distance });
    reloadEvents();
    setTestMsg(`Évaluation lancée avec ${distance} cm — voir le journal.`);
  }

  return (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-3xl text-ink">Alertes e-mail</h2>
        <span className={`tag ${mailConfigured ? "tag-easy" : "tag-medium"}`}>
          {mailConfigured ? "SMTP actif" : "Mode simulation"}
        </span>
      </div>

      {!mailConfigured && (
        <p className="text-sm text-ink-muted">
          Aucun serveur SMTP configuré : les e-mails sont <em>simulés</em> (journalisés
          côté serveur et marqués « simulé »). Renseignez <code>SMTP_*</code> dans
          <code> backend/.env</code> pour des envois réels.
        </p>
      )}

      {/* Création */}
      <form
        className="card p-5 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end"
        aria-label="Ajouter une règle d'alerte"
        onSubmit={(e) => { e.preventDefault(); create(); }}
      >
        <div className="sm:col-span-3">
          <label htmlFor="alert-label" className="eyebrow">Libellé</label>
          <input id="alert-label" className="field mt-1" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Objet trop proche" />
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="alert-comp" className="eyebrow">Condition</label>
          <select id="alert-comp" className="field mt-1" value={comparateur} onChange={(e) => setComparateur(e.target.value as "below" | "above")}>
            <option value="below">distance en dessous du seuil</option>
            <option value="above">distance au-dessus du seuil</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="alert-seuil" className="eyebrow">Seuil (cm)</label>
          <input id="alert-seuil" type="number" className="field mt-1" value={seuil} onChange={(e) => setSeuil(Number(e.target.value))} />
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="alert-email" className="eyebrow">E-mail</label>
          <input id="alert-email" type="email" autoComplete="email" className="field mt-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@isep.fr" />
        </div>
        <div className="sm:col-span-1">
          <button type="submit" className="btn-ink w-full" disabled={busy} aria-label="Ajouter la règle d'alerte">+</button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-4">
        <button className="btn-line text-xs" onClick={testEmail}>Envoyer un e-mail de test</button>
        <button className="btn-line text-xs" onClick={() => evaluate(10)}>Simuler 10 cm</button>
        <button className="btn-line text-xs" onClick={() => evaluate(70)}>Simuler 70 cm</button>
      </div>
      <p role="status" aria-live="polite" className="text-sm text-ink-muted italic font-serif min-h-[1.25rem]">
        {testMsg}
      </p>

      {/* Liste */}
      {alerts.length === 0 ? (
        <p className="text-sm text-ink-faint font-serif italic py-4">Aucune règle d'alerte définie.</p>
      ) : (
        <div className="divide-y divide-line border-y border-line">
          {alerts.map((a) => (
            <div key={a.id} className="py-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-4">
                <p className="font-serif text-lg text-ink leading-tight">{a.label}</p>
                <p className="text-[11px] tracking-[0.14em] uppercase text-ink-faint">{a.email}</p>
              </div>
              <div className="sm:col-span-5 text-sm text-ink-muted">
                Déclenche si distance{" "}
                <span className="text-ink font-medium">
                  {a.comparateur === "below" ? "< " : "> "}{a.seuil_cm} cm
                </span>
                {a.derniere_alerte_at && (
                  <span className="block text-xs text-ink-faint mt-0.5">
                    Dernier envoi : {new Date(a.derniere_alerte_at).toLocaleString("fr-FR")}
                  </span>
                )}
              </div>
              <div className="sm:col-span-3 flex items-center justify-end gap-3">
                <button
                  onClick={() => patch(a, { active: a.active ? 0 : 1 })}
                  aria-pressed={!!a.active}
                  aria-label={`Alerte « ${a.label} » : ${a.active ? "active, cliquer pour désactiver" : "inactive, cliquer pour activer"}`}
                  className={`text-xs px-3 py-1.5 border transition-colors ${
                    a.active ? "border-moss text-moss" : "border-line text-ink-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  {a.active ? "Active" : "Inactive"}
                </button>
                <button onClick={() => remove(a)} aria-label={`Supprimer l'alerte ${a.label}`} className="text-ink-faint hover:text-clay transition-colors text-lg leading-none">
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ──────────────────────────── Journal ──────────────────────────── */

const STATUS_TAG: Record<AlertEvent["email_status"], string> = {
  envoye: "tag tag-easy",
  simule: "tag tag-medium",
  echec: "tag tag-hard",
};

function EventSection({ events, reload }: { events: AlertEvent[]; reload: () => void }) {
  return (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-3xl text-ink">Journal des alertes</h2>
        <button onClick={reload} className="text-sm text-ink-muted hover:text-ink transition-colors">Rafraîchir</button>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-ink-faint font-serif italic py-4">Aucun déclenchement pour l'instant.</p>
      ) : (
        <table className="w-full border-t border-line">
          <caption className="sr-only">Journal des déclenchements d'alerte récents</caption>
          <thead>
            <tr>
              {["Quand", "Alerte", "Distance", "E-mail", "Statut"].map((h) => (
                <th key={h} scope="col" className="text-left py-3 text-[11px] tracking-[0.14em] uppercase text-ink-faint font-medium border-b border-line">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-b border-line hover:bg-paper-raised transition-colors">
                <td className="py-3 text-sm text-ink-muted">{new Date(e.created_at).toLocaleString("fr-FR")}</td>
                <td className="py-3 text-sm text-ink">{e.label}</td>
                <td className="py-3 num text-sm text-clay">{e.distance_cm.toFixed(1)} cm</td>
                <td className="py-3 text-sm text-ink-muted">{e.email}</td>
                <td className="py-3"><span className={STATUS_TAG[e.email_status]}>{e.email_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
