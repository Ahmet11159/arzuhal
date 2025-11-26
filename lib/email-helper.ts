/**
 * Email helper - Runtime email sending
 * This file avoids build-time dependencies on optional email packages
 * @ts-nocheck - Optional dependencies may not be installed
 */

import { logger } from './logger'

export interface EmailOptions {
  to: string
  subject: string
  html?: string
  text?: string
  from?: string
}

/**
 * Send email using configured provider
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const provider = process.env.EMAIL_PROVIDER || 'none'

  if (provider === 'none') {
    logger.log('Email sending disabled (EMAIL_PROVIDER=none):', {
      to: options.to,
      subject: options.subject,
    })
    return false
  }

  try {
    if (provider === 'nodemailer') {
      return await sendWithNodemailer(options)
    } else if (provider === 'sendgrid') {
      return await sendWithSendGrid(options)
    } else {
      logger.error('Invalid EMAIL_PROVIDER:', provider)
      return false
    }
  } catch (error: any) {
    logger.error('Error sending email:', error)
    return false
  }
}

async function sendWithNodemailer(options: EmailOptions): Promise<boolean> {
  try {
    // Runtime import - package may not be installed
    // @ts-expect-error - Optional dependency, may not be installed
    // eslint-disable-next-line
    const nodemailer = await import('nodemailer').catch((err) => {
      logger.log('Nodemailer not available (optional dependency)')
      return null
    })
    
    if (!nodemailer) {
      return false
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const mailOptions = {
      from: options.from || process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    }

    const info = await transporter.sendMail(mailOptions)
    logger.log('Email sent successfully:', {
      to: options.to,
      subject: options.subject,
      messageId: info.messageId,
    })
    return true
  } catch (error: any) {
    logger.error('Nodemailer error:', error)
    return false
  }
}

async function sendWithSendGrid(options: EmailOptions): Promise<boolean> {
  try {
    const apiKey = process.env.SENDGRID_API_KEY
    if (!apiKey) {
      logger.error('SENDGRID_API_KEY is not set')
      return false
    }

    // Runtime import - package may not be installed
    // @ts-ignore - Optional dependency, may not be installed
    const sgMail = await import('@sendgrid/mail').catch((err: any) => {
      logger.log('SendGrid not available (optional dependency)')
      return null
    })
    
    if (!sgMail) {
      return false
    }

    sgMail.default.setApiKey(apiKey)

    const msg = {
      to: options.to,
      from: options.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@arzuhal.com',
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    }

    await sgMail.default.send(msg)
    logger.log('Email sent successfully via SendGrid:', {
      to: options.to,
      subject: options.subject,
    })
    return true
  } catch (error: any) {
    logger.error('SendGrid error:', error)
    return false
  }
}

/**
 * Send contact form auto-reply email
 */
export async function sendAutoReply(email: string, name: string): Promise<boolean> {
  const subject = 'ARZUHAL - Mesajınız Alındı'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #8B6914;">Merhaba ${name},</h2>
      <p>ARZUHAL'e gönderdiğiniz mesajınızı aldık. En kısa sürede size geri dönüş yapacağız.</p>
      <p>Teşekkür ederiz.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">ARZUHAL - Premium Kahve Fincanları</p>
    </div>
  `
  const text = `Merhaba ${name},\n\nARZUHAL'e gönderdiğiniz mesajınızı aldık. En kısa sürede size geri dönüş yapacağız.\n\nTeşekkür ederiz.\n\nARZUHAL - Premium Kahve Fincanları`

  return await sendEmail({
    to: email,
    subject,
    html,
    text,
  })
}

/**
 * Send admin reply email to contact message
 */
export async function sendReplyEmail(
  email: string,
  subject: string,
  message: string,
  originalSubject?: string
): Promise<boolean> {
  const replySubject = subject || `Yanıt: ${originalSubject || 'Mesajınıza Yanıt'}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #8B6914;">Merhaba,</h2>
      <p>ARZUHAL ekibinden size yanıt:</p>
      <div style="background: #f9f9f9; padding: 20px; border-left: 4px solid #8B6914; margin: 20px 0;">
        ${message.replace(/\n/g, '<br>')}
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">ARZUHAL - Premium Kahve Fincanları</p>
    </div>
  `
  const text = `Merhaba,\n\nARZUHAL ekibinden size yanıt:\n\n${message}\n\nARZUHAL - Premium Kahve Fincanları`

  return await sendEmail({
    to: email,
    subject: replySubject,
    html,
    text,
  })
}

