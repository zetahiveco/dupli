import { Resend } from "resend"

export async function sendEmail(to: string, subject: string, body: string, attachments: Array<{ filename: string, content: string }> = []) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
        from: "noreply@mail.dupli.dev",
        to: to,
        subject: subject,
        html: body,
        attachments: attachments
    })
    return {
        success: true
    }
}
