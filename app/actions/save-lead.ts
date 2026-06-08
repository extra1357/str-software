"use server";

import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function notifyEmail(name: string, email: string, phone: string, release: string) {
  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: process.env.NOTIFY_EMAIL!,
      subject: `🔔 Novo Lead: ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f172a;color:#f1f5f9;border-radius:12px;">
          <h2 style="color:#3b82f6;margin-top:0;">🔔 Novo Lead Recebido</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#94a3b8;width:120px;">Nome</td><td style="padding:8px 0;font-weight:bold;">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#94a3b8;">E-mail</td><td style="padding:8px 0;">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#94a3b8;">Telefone</td><td style="padding:8px 0;">${phone}</td></tr>
          </table>
          <div style="margin-top:16px;padding:16px;background:#1e293b;border-radius:8px;border-left:4px solid #3b82f6;">
            <p style="color:#94a3b8;margin:0 0 8px 0;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Mensagem completa</p>
            <p style="margin:0;line-height:1.6;white-space:pre-wrap;">${release}</p>
          </div>
          <p style="margin-top:20px;font-size:12px;color:#475569;">
            Recebido em ${new Date().toLocaleString("pt-BR")} · STR Sistemas
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("ERRO_EMAIL:", err);
  }
}

async function notifyWhatsApp(name: string, phone: string, release: string) {
  try {
    await fetch(process.env.ZAPI_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: process.env.NOTIFY_PHONE!,
        message: `🔔 *Novo Lead STR*\n\n👤 *Nome:* ${name}\n📞 *Telefone:* ${phone}\n\n📝 *Mensagem:*\n${release}`,
      }),
    });
  } catch (err) {
    console.error("ERRO_WHATSAPP:", err);
  }
}

export async function saveLead(formData: FormData) {
  try {
    const name    = formData.get("name")    as string;
    const email   = formData.get("email")   as string;
    const phone   = formData.get("phone")   as string;
    const release = formData.get("release") as string;

    await prisma.lead.create({
      data: { name, email, phone, release },
    });

    Promise.allSettled([
      notifyEmail(name, email, phone, release),
      notifyWhatsApp(name, phone, release),
    ]);

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("ERRO_AO_SALVAR_LEAD:", error);
    return { success: false };
  }
}
