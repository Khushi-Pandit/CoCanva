/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const goToLogin = () => router.push("/login");

  const handleSignUp = async (
    email: string,
    fullName: string,
    password: string,
    confirmPassword: string
  ) => {
    setLoading(true);
    setError(null);

    if (!fullName || !email || !password || !confirmPassword) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Something went wrong");
        return;
      }
      if (data.token) localStorage.setItem("token", data.token);
      router.push("/Main");
    } catch (err: any) {
      setError(err?.message || "Network Error");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSignUp(email, fullName, password, confirmPassword);
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .signup-page {
          min-height: 100vh;
          width: 100%;
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 40%, #6ee7b7 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          font-family: 'Segoe UI', sans-serif;
        }

        .card {
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08);
          display: flex;
          width: 100%;
          max-width: 900px;
          overflow: hidden;
        }

        /* LEFT PANEL */
        .left-panel {
          background: linear-gradient(160deg, #6ee7b7 0%, #34d399 50%, #10b981 100%);
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 32px;
          position: relative;
          overflow: hidden;
        }

        .left-panel::before {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 200px; height: 200px;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
        }

        .left-panel::after {
          content: '';
          position: absolute;
          bottom: -40px; left: -40px;
          width: 160px; height: 160px;
          background: rgba(255,255,255,0.08);
          border-radius: 50%;
        }

        .left-panel img {
          width: 240px;
          height: 240px;
          object-fit: contain;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 8px 24px rgba(0,0,0,0.12));
        }

        .left-tagline {
          color: #ffffff;
          font-size: 18px;
          font-weight: 600;
          text-align: center;
          margin-top: 20px;
          line-height: 1.4;
          position: relative;
          z-index: 1;
        }

        .left-sub {
          color: rgba(255,255,255,0.85);
          font-size: 13px;
          text-align: center;
          margin-top: 8px;
          line-height: 1.5;
          position: relative;
          z-index: 1;
        }

        /* RIGHT PANEL */
        .right-panel {
          flex: 1;
          padding: 40px 44px 36px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .brand {
          font-size: 26px;
          font-weight: 700;
          color: #064e3b;
          text-align: center;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }

        .brand span { color: #10b981; }

        .subtitle {
          text-align: center;
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 24px;
        }

        /* LABELS */
        .field-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
          letter-spacing: 0.1px;
        }

        /* INPUTS */
        .input-field {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid #d1d5db;
          border-radius: 10px;
          font-size: 14px;
          color: #111827;
          background: #f9fafb;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          outline: none;
          margin-bottom: 14px;
        }

        .input-field::placeholder { color: #9ca3af; }

        .input-field:focus {
          border-color: #10b981;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }

        /* PASSWORD WRAP */
        .password-wrap {
          position: relative;
          margin-bottom: 14px;
        }

        .password-wrap .input-field {
          margin-bottom: 0;
          padding-right: 44px;
        }

        .eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          display: flex;
          align-items: center;
          padding: 4px;
          transition: color 0.2s;
        }

        .eye-btn:hover { color: #10b981; }

        /* ERROR */
        .error-msg {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          font-size: 13px;
          padding: 9px 12px;
          border-radius: 8px;
          margin-bottom: 14px;
        }

        /* SUBMIT BUTTON */
        .submit-btn {
          width: 100%;
          background: #10b981;
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
          padding: 12px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
          margin-top: 4px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #059669;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);
          transform: translateY(-1px);
        }

        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* LOGIN LINK */
        .login-row {
          display: flex;
          justify-content: center;
          gap: 4px;
          font-size: 13px;
          color: #6b7280;
          margin-top: 16px;
        }

        .login-row span {
          color: #10b981;
          font-weight: 600;
          text-decoration: underline;
          cursor: pointer;
        }

        .login-row span:hover { color: #059669; }

        /* SPINNER */
        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .card { flex-direction: column; max-width: 420px; }

          .left-panel { padding: 28px 24px; }

          .left-panel img { width: 160px; height: 160px; }

          .left-tagline { font-size: 15px; margin-top: 14px; }

          .right-panel { padding: 28px 28px 36px; }
        }

        @media (max-width: 420px) {
          .signup-page { padding: 0; }
          .card { border-radius: 0; min-height: 100vh; }
          .right-panel { padding: 24px 20px 32px; }
        }
      `}</style>

      <div className="signup-page">
        <div className="card">

          {/* LEFT */}
          <div className="left-panel">
            <Image
              src="/images/login.png"
              alt="Signup Illustration"
              width={240}
              height={240}
            />
            <p className="left-tagline">Join Canvasly Today!</p>
            <p className="left-sub">
              Create, collaborate, and bring<br />your ideas to life.
            </p>
          </div>

          {/* RIGHT */}
          <div className="right-panel">
            <h1 className="brand">Canvas<span>ly</span></h1>
            <p className="subtitle">Create your free account</p>

            <form onSubmit={onSubmit}>

              {/* Full Name */}
              <label className="field-label">Full Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
              />

              {/* Email */}
              <label className="field-label">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              {/* Password */}
              <label className="field-label">Password</label>
              <div className="password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input-field"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                {password.length > 0 && (
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                )}
              </div>

              {/* Confirm Password */}
              <label className="field-label">Confirm Password</label>
              <div className="password-wrap">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="input-field"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                {confirmPassword.length > 0 && (
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                )}
              </div>

              {error && <div className="error-msg">{error}</div>}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <><div className="spinner" /> Signing Up...</>
                ) : "Create Account"}
              </button>

            </form>

            <div className="login-row">
              <p>Already have an account?</p>
              <span onClick={goToLogin}>Log In</span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}