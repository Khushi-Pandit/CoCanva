/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Step 1: Firebase se login karo
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Step 2: Firebase token lo
      const token = await userCredential.user.getIdToken();

      // Step 3: Backend ko verify + user fetch karne bhejo
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }

      // Step 4: Token save karo
      localStorage.setItem("token", token);
      router.push("/dashboard");

    } catch (err: any) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Invalid email or password");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with this email");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later");
      } else {
        setError(err.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .login-page {
          min-height: 100vh; width: 100%;
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 40%, #6ee7b7 100%);
          display: flex; align-items: center; justify-content: center;
          padding: 24px 16px; font-family: 'Segoe UI', sans-serif;
        }
        .card {
          background: #ffffff; border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08);
          display: flex; width: 100%; max-width: 900px; min-height: 560px; overflow: hidden;
        }
        .left-panel {
          background: linear-gradient(160deg, #6ee7b7 0%, #34d399 50%, #10b981 100%);
          flex: 1; display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 48px 32px; position: relative; overflow: hidden;
        }
        .left-panel::before {
          content: ''; position: absolute; top: -60px; right: -60px;
          width: 200px; height: 200px; background: rgba(255,255,255,0.1); border-radius: 50%;
        }
        .left-panel::after {
          content: ''; position: absolute; bottom: -40px; left: -40px;
          width: 160px; height: 160px; background: rgba(255,255,255,0.08); border-radius: 50%;
        }
        .left-panel img { width: 260px; height: 260px; object-fit: contain; position: relative; z-index: 1; filter: drop-shadow(0 8px 24px rgba(0,0,0,0.12)); }
        .left-tagline { color: #ffffff; font-size: 18px; font-weight: 600; text-align: center; margin-top: 20px; line-height: 1.4; position: relative; z-index: 1; }
        .left-sub { color: rgba(255,255,255,0.85); font-size: 13px; text-align: center; margin-top: 8px; line-height: 1.5; position: relative; z-index: 1; }
        .right-panel { flex: 1; padding: 48px 44px; display: flex; flex-direction: column; justify-content: center; }
        .brand { font-size: 28px; font-weight: 700; color: #064e3b; text-align: center; letter-spacing: -0.5px; margin-bottom: 32px; }
        .brand span { color: #10b981; }
        .field-label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
        .input-field {
          width: 100%; padding: 11px 14px; border: 1.5px solid #d1d5db; border-radius: 10px;
          font-size: 14px; color: #111827; background: #f9fafb; outline: none; margin-bottom: 18px;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .input-field::placeholder { color: #9ca3af; }
        .input-field:focus { border-color: #10b981; background: #ffffff; box-shadow: 0 0 0 3px rgba(16,185,129,0.15); }
        .password-wrap { position: relative; margin-bottom: 6px; }
        .password-wrap .input-field { margin-bottom: 0; padding-right: 44px; }
        .eye-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #6b7280; display: flex; align-items: center; padding: 4px; }
        .eye-btn:hover { color: #10b981; }
        .forgot { text-align: right; margin-top: 6px; margin-bottom: 20px; }
        .forgot a { font-size: 12.5px; color: #10b981; text-decoration: underline; cursor: pointer; font-weight: 500; }
        .error-msg { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; font-size: 13px; padding: 9px 12px; border-radius: 8px; margin-bottom: 14px; }
        .submit-btn {
          width: 100%; background: #10b981; color: #ffffff; font-size: 15px; font-weight: 600;
          padding: 12px; border: none; border-radius: 10px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
        }
        .submit-btn:hover:not(:disabled) { background: #059669; box-shadow: 0 4px 16px rgba(16,185,129,0.35); transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .divider { display: flex; align-items: center; gap: 12px; margin: 22px 0; }
        .divider hr { flex: 1; border: none; border-top: 1px solid #e5e7eb; }
        .divider span { font-size: 12px; color: #9ca3af; font-weight: 500; }
        .google-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 11px; border: 1.5px solid #e5e7eb; border-radius: 10px; background: #ffffff;
          font-size: 13.5px; font-weight: 500; color: #374151; cursor: pointer;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .google-btn:hover { border-color: #10b981; background: #f0fdf4; box-shadow: 0 2px 8px rgba(16,185,129,0.1); }
        .signup-row { display: flex; justify-content: center; gap: 4px; font-size: 13px; color: #6b7280; margin-top: 18px; }
        .signup-row span { color: #10b981; font-weight: 600; text-decoration: underline; cursor: pointer; }
        .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .card { flex-direction: column; max-width: 420px; }
          .left-panel { padding: 32px 24px; }
          .left-panel img { width: 180px; height: 180px; }
          .right-panel { padding: 32px 28px 40px; }
        }
        @media (max-width: 420px) {
          .login-page { padding: 0; }
          .card { border-radius: 0; min-height: 100vh; }
          .right-panel { padding: 28px 20px 36px; }
        }
      `}</style>

      <div className="login-page">
        <div className="card">
          <div className="left-panel">
            <Image src="/images/login.png" alt="Login Illustration" width={260} height={260} />
            <p className="left-tagline">Turn your ideas into reality with Canvasly!</p>
            <p className="left-sub">Brainstorm. Plan. Achieve.<br />Your creativity starts here.</p>
          </div>

          <div className="right-panel">
            <h1 className="brand">Canvas<span>ly</span></h1>

            <form onSubmit={handleLogin}>
              <label className="field-label">Email</label>
              <input type="email" className="input-field" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />

              <label className="field-label">Password</label>
              <div className="password-wrap">
                <input type={showPassword ? "text" : "password"} className="input-field"
                  placeholder="Enter your password" value={password}
                  onChange={(e) => setPassword(e.target.value)} required />
                {password.length > 0 && (
                  <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                )}
              </div>

              <div className="forgot"><a>Forgot Password?</a></div>

              {error && <div className="error-msg">{error}</div>}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? <><div className="spinner" /> Signing In...</> : "Sign In"}
              </button>
            </form>

            <div className="divider"><hr /><span>OR</span><hr /></div>

            <button className="google-btn">
              <Image src="/images/googleIcon.png" alt="Google" width={18} height={18} />
              Sign in with Google
            </button>

            <div className="signup-row">
              <p>Are you new?</p>
              <span onClick={() => router.push("/signup")}>Create an Account</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}