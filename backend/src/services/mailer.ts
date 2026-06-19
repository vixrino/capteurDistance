import nodemailer, { Transporter } from "nodemailer";

/**
 * Service d'envoi d'e-mails.
 * ----------------------------------------------------------------------------
 * Si des identifiants SMTP sont fournis dans .env (SMTP_HOST, SMTP_USER...),
 * les e-mails sont réellement envoyés. Sinon, le service bascule en mode
 * « simulation » : le mail est journalisé dans la console et marqué `simule`,
 * pour que la démo fonctionne sans serveur mail.
 *
 * Variables .env :
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE (true/false)
 *   MAIL_FROM (adresse expéditeur affichée)
 */

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export type MailStatus = "envoye" | "simule" | "echec";

export interface SendResult {
  status: MailStatus;
  detail: string;
}

export function mailerConfigured(): boolean {
  return getTransporter() !== null;
}

export async function sendMail(to: string, subject: string, text: string): Promise<SendResult> {
  const t = getTransporter();
  const from = process.env.MAIL_FROM || "Capteur Distance <alerte@capteur-distance.local>";

  // Pas de SMTP configuré → simulation (utile pour la démo / soutenance).
  if (!t) {
    console.log(`📧  [SIMULÉ] À: ${to} | Sujet: ${subject}\n${text}`);
    return { status: "simule", detail: "SMTP non configuré — e-mail simulé (voir console)." };
  }

  try {
    const info = await t.sendMail({ from, to, subject, text });
    console.log(`📧  Envoyé à ${to} (id: ${info.messageId})`);
    return { status: "envoye", detail: `Envoyé (${info.messageId})` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error(`📧  Échec envoi à ${to}: ${msg}`);
    return { status: "echec", detail: msg };
  }
}
