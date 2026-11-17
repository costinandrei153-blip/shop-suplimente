
import { useState, type FormEvent } from "react";
import {
  login,
  register,
  type AuthResponse,
} from "../services/authService";
import "./AuthModal.css";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: AuthResponse) => void;
}

type AuthMode = "login" | "register";

function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      let response: AuthResponse;

      if (isRegister) {
        response = await register({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
        });
      } else {
        response = await login({
          email: email.trim(),
          password,
        });
      }

      onSuccess(response);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const changeMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError("");
    setPassword("");
  };

  return (
    <div
      className="auth-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button
          className="auth-close"
          onClick={onClose}
          aria-label="Close authentication"
          type="button"
        >
          ×
        </button>

        <div className="auth-visual">
          <span className="auth-brand">
            TRENIX<span>.</span>
          </span>

          <div className="auth-visual-content">
            <span className="auth-kicker">
              PREMIUM SPORTS NUTRITION
            </span>

            <h2>
              BUILT FOR
              <br />
              <span>STRENGTH.</span>
            </h2>

            <p>
              Discipline. Consistency.
              <br />
              Progress.
            </p>
          </div>

          <span className="auth-visual-footer">
            TRAIN HARD. RECOVER SMART.
          </span>
        </div>

        <div className="auth-form-area">
          <div className="auth-heading">
            <span className="auth-kicker">
              {isRegister ? "JOIN THE COMMUNITY" : "WELCOME BACK"}
            </span>

            <h1 id="auth-title">
              {isRegister ? "CREATE ACCOUNT." : "SIGN IN."}
            </h1>

            <p>
              {isRegister
                ? "Create your TRENIX account and get started."
                : "Sign in to access your TRENIX account."}
            </p>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={!isRegister ? "auth-tab active" : "auth-tab"}
              onClick={() => changeMode("login")}
            >
              LOGIN
            </button>

            <button
              type="button"
              className={isRegister ? "auth-tab active" : "auth-tab"}
              onClick={() => changeMode("register")}
            >
              REGISTER
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && (
              <div className="auth-name-fields">
                <label className="auth-field">
                  <span>FIRST NAME</span>
                  <input
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    maxLength={100}
                    autoComplete="given-name"
                    required
                  />
                </label>

                <label className="auth-field">
                  <span>LAST NAME</span>
                  <input
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    maxLength={100}
                    autoComplete="family-name"
                    required
                  />
                </label>
              </div>
            )}

            <label className="auth-field">
              <span>EMAIL ADDRESS</span>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={150}
                autoComplete="email"
                required
              />
            </label>

            <label className="auth-field">
              <span>PASSWORD</span>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={100}
                autoComplete={
                  isRegister ? "new-password" : "current-password"
                }
                required
              />
            </label>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "PLEASE WAIT..."
                : isRegister
                  ? "CREATE ACCOUNT"
                  : "SIGN IN"}

              {!loading && <span>↗</span>}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister
              ? "Already have an account?"
              : "Don't have an account?"}

            <button
              type="button"
              onClick={() =>
                changeMode(isRegister ? "login" : "register")
              }
            >
              {isRegister ? "SIGN IN" : "REGISTER"}
            </button>
          </p>

          <span className="auth-security-note">
            SECURE AUTHENTICATION · TRENIX
          </span>
        </div>
      </section>
    </div>
  );
}

export default AuthModal;
