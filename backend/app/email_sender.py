"""
Send verification/confirmation emails via Gmail SMTP only.
Configure SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USER, SMTP_PASSWORD (App Password), FROM_EMAIL in .env.
"""
import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

# Gmail SMTP defaults
DEFAULT_SMTP_HOST = "smtp.gmail.com"
DEFAULT_SMTP_PORT = 587


def _get_gmail_config():
    """Return (host, port, user, password, from_email). Uses Gmail defaults; password is cleaned for App Passwords."""
    host = (os.getenv("SMTP_HOST") or DEFAULT_SMTP_HOST).strip()
    port = int(os.getenv("SMTP_PORT", str(DEFAULT_SMTP_PORT)))
    user = (os.getenv("SMTP_USER") or "").strip()
    raw = (os.getenv("SMTP_PASSWORD") or "").strip().strip('"').strip("'")
    # Gmail App Passwords are 16 alphanumeric chars; strip anything else to avoid 535 errors
    password = "".join(c for c in raw if c.isalnum()) if raw else ""
    from_email = (os.getenv("FROM_EMAIL") or user or "").strip()
    if not all([user, password]):
        return None, port, user, password, from_email
    return host, port, user, password, from_email


def is_smtp_configured() -> bool:
    """True if SMTP (Gmail) is configured in .env and will be used for verification emails."""
    host, *_ = _get_gmail_config()
    return host is not None


def _build_verification_email_content(verification_link: str, user_name: str) -> tuple[str, str, str]:
    """Return (subject, plain_body, html_body) for verification/confirmation email."""
    subject = "Confirm your email - Academic Early Warning System"
    plain_body = f"""Hello {user_name},

Before you can sign in, you must confirm your email address by clicking the link below:

{verification_link}

Your account will be active only after you click this confirmation link. The link expires in 24 hours. If you did not create an account, you can ignore this email.

— Academic Early Warning System
"""
    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">Academic Early Warning System</h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">Confirm your email address</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.5;">Hello {user_name},</p>
              <p style="margin: 0 0 24px; font-size: 15px; color: #6b7280; line-height: 1.6;">Before you can sign in, you must confirm your email by clicking the button below. Your account will be active only after you click this confirmation link.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="{verification_link}" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);">Confirm email</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">You must click the link above to confirm your email before you can sign in. This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
              <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin: 4px 0 0; font-size: 12px; color: #3b82f6; word-break: break-all;">{verification_link}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">— Academic Early Warning System</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return subject, plain_body, html_body


def _build_password_reset_email_content(reset_link: str, user_name: str) -> tuple[str, str, str]:
    """Return (subject, plain_body, html_body) for password reset email."""
    subject = "Reset your password - Academic Early Warning System"
    plain_body = f"""Hello {user_name},

You requested a password reset. Click the link below to set a new password:

{reset_link}

This link expires in 1 hour. If you didn't request a reset, you can ignore this email.

— Academic Early Warning System
"""
    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">Academic Early Warning System</h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">Reset your password</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.5;">Hello {user_name},</p>
              <p style="margin: 0 0 24px; font-size: 15px; color: #6b7280; line-height: 1.6;">You requested a password reset. Click the button below to set a new password.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="{reset_link}" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);">Reset password</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email.</p>
              <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin: 4px 0 0; font-size: 12px; color: #3b82f6; word-break: break-all;">{reset_link}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">— Academic Early Warning System</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return subject, plain_body, html_body


def send_password_reset_email(to_email: str, reset_link: str, user_name: str) -> tuple[bool, str | None]:
    """Send password reset email via Gmail SMTP. Returns (True, None) if sent, (False, error_message) otherwise."""
    config = _get_gmail_config()
    host, port, user, password, from_email = config
    if host is None:
        return False, "Gmail not configured"
    subject, plain_body, html_body = _build_password_reset_email_content(reset_link, user_name)
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(user, password)
            server.sendmail(from_email, to_email, msg.as_string())
        logger.info("Password reset email sent to %s", to_email)
        return True, None
    except Exception as e:
        logger.exception("Gmail SMTP failed: %s", e)
        return False, str(e)


def send_verification_email(to_email: str, verification_link: str, user_name: str) -> tuple[bool, str | None]:
    """Send verification/confirmation email via Gmail SMTP. Returns (True, None) if sent, (False, error_message) otherwise."""
    config = _get_gmail_config()
    host, port, user, password, from_email = config
    if host is None:
        msg = (
            "Gmail not configured. Set SMTP_USER and SMTP_PASSWORD (Gmail App Password) in .env. "
            "Optional: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, FROM_EMAIL."
        )
        logger.warning(msg)
        return False, msg

    subject, plain_body, html_body = _build_verification_email_content(verification_link, user_name)
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(user, password)
            server.sendmail(from_email, to_email, msg.as_string())
        logger.info("Verification email sent via Gmail to %s", to_email)
        return True, None
    except Exception as e:
        err = str(e)
        logger.exception("Gmail SMTP failed: %s", e)
        return False, err


def _build_account_decision_email_content(user_name: str, approved: bool) -> tuple[str, str, str]:
    """Return (subject, plain_body, html_body) for account approved or declined notification."""
    if approved:
        subject = "Your account is active - Academic Early Warning System"
        plain_body = f"""Hello {user_name},

Your account is active. You can now sign in with your email and password.

— Academic Early Warning System
"""
        html_title = "Your account is active"
        html_lead = "Your account is active. You can now sign in with your email and password."
    else:
        subject = "Your account request was not approved - Academic Early Warning System"
        plain_body = f"""Hello {user_name},

Your account request for the Academic Early Warning System has been declined.

If you believe this is an error, please contact your institution's administrator.

— Academic Early Warning System
"""
        html_title = "Account request declined"
        html_lead = "Your account request has been declined. If you believe this is an error, please contact your institution's administrator."
    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html_title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">Academic Early Warning System</h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">{html_title}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.5;">Hello {user_name},</p>
              <p style="margin: 0; font-size: 15px; color: #6b7280; line-height: 1.6;">{html_lead}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">— Academic Early Warning System</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return subject, plain_body, html_body


def send_account_decision_email(to_email: str, user_name: str, approved: bool) -> tuple[bool, str | None]:
    """Send account approved or declined email. Returns (True, None) if sent, (False, error_message) otherwise."""
    config = _get_gmail_config()
    host, port, user, password, from_email = config
    if host is None:
        return False, "Gmail not configured"
    subject, plain_body, html_body = _build_account_decision_email_content(user_name, approved)
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(user, password)
            server.sendmail(from_email, to_email, msg.as_string())
        logger.info("Account decision email (%s) sent to %s", "approved" if approved else "declined", to_email)
        return True, None
    except Exception as e:
        logger.exception("Gmail SMTP failed: %s", e)
        return False, str(e)


def send_test_email(to_email: str | None = None) -> tuple[bool, str]:
    """
    Send a test verification email via Gmail. Returns (success, message).
    If to_email is None, uses SMTP_USER as recipient.
    """
    host, port, user, password, from_email = _get_gmail_config()
    if host is None:
        return False, "Gmail not configured. Set SMTP_USER and SMTP_PASSWORD (App Password) in .env"
    dest = (to_email or user or "").strip()
    if not dest:
        return False, "No recipient. Use ?to=your@email.com or set SMTP_USER in .env"
    link = (os.getenv("FRONTEND_URL") or "http://localhost:5173").rstrip("/") + "/verify-email?token=TEST"
    ok, err = send_verification_email(dest, link, "Test User")
    if ok:
        return True, f"Test email sent to {dest}. Check inbox (and spam)."
    return False, err or "Send failed."
