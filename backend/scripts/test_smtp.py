import os

from dotenv import load_dotenv

from app.email_sender import send_verification_email


def main():
    load_dotenv()

    to_email = os.getenv("TEST_EMAIL_TO") or input("Send test email to: ").strip()
    frontend_url = (os.getenv("FRONTEND_URL") or "http://localhost:5173").rstrip("/")
    link = f"{frontend_url}/verify-email?token=TEST_TOKEN"

    ok = send_verification_email(to_email, link, user_name="Test User")
    if ok:
        print("✅ SMTP looks good: test email sent.")
        return

    print("❌ SMTP not configured or failed to send.")
    print("Set these in backend/.env and try again:")
    print("  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD (and optionally FROM_EMAIL)")


if __name__ == "__main__":
    main()

