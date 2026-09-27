import { useState } from 'react';
import './Auth.css';
import { SiteHeader } from './Home.jsx';
import { supabase } from './supabaseClient.js';

const MIN_PASSWORD_LENGTH = 6; // Supabase's default minimum

// Where the confirmation email link sends people back to. This URL must be
// allowed under Authentication → URL Configuration in the Supabase dashboard.
const emailRedirectTo = () => `${window.location.origin}/`;

const COPY = {
  login: {
    eyebrow: 'Welcome back',
    title: 'Log in',
    lead: 'Pick up where you left off: your neighborhoods, events, and people.',
    submit: 'Log in',
    submitting: 'Logging in…',
  },
  signup: {
    eyebrow: 'Join We Movers',
    title: 'Create your account',
    lead: 'Save neighborhoods you like and find the people who make a place feel like home.',
    submit: 'Sign up',
    submitting: 'Creating account…',
  },
};

// Turn Supabase Auth errors into messages people can act on.
function friendlyError(error) {
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  switch (error.code) {
    case 'invalid_credentials':
      return "That email and password don't match. Check them and try again.";
    case 'email_not_confirmed':
      return 'Please confirm your email first. Use the link we sent you, or send a new one below.';
    case 'user_already_exists':
    case 'email_exists':
      return 'An account with this email already exists. Try logging in instead.';
    case 'weak_password':
      return error.message || 'That password is too weak. Try a longer one.';
    case 'email_address_invalid':
      return "That email address doesn't look right. Check it and try again.";
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many attempts. Please wait a minute and try again.';
    case 'signup_disabled':
      return 'New signups are turned off right now.';
    default:
      return error.message || 'Something went wrong. Please try again.';
  }
}

function ResendButton({ email }) {
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [message, setMessage] = useState('');

  const resend = async () => {
    setState('sending');
    setMessage('');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: emailRedirectTo() },
    });
    if (error) {
      setState('error');
      setMessage(friendlyError(error));
    } else {
      setState('sent');
      setMessage(`We sent a new link to ${email}.`);
    }
  };

  return (
    <div className="auth__resend">
      <button
        className="auth__link-btn"
        type="button"
        onClick={resend}
        disabled={state === 'sending'}
      >
        {state === 'sending' ? 'Sending…' : 'Resend confirmation email'}
      </button>
      {message && (
        <p className={state === 'error' ? 'auth__error' : 'auth__notice'} role="status">
          {message}
        </p>
      )}
    </div>
  );
}

function CheckEmail({ email, onBack }) {
  return (
    <div className="auth__card">
      <p className="eyebrow">Almost there</p>
      <h2 className="auth__card-title">Check your email</h2>
      <p>
        We sent a confirmation link to <strong>{email}</strong>. Open it on this device to
        finish creating your account. You&rsquo;ll be signed in automatically.
      </p>
      <p className="auth__hint">Don&rsquo;t see it? Check your spam folder, or send it again.</p>
      <ResendButton email={email} />
      <p className="auth__switch">
        Wrong email? <button className="auth__link-btn" type="button" onClick={onBack}>Start over</button>
        {' '}&middot; <a href="#/login">Log in</a>
      </p>
    </div>
  );
}

export default function AuthPage({ mode, initialError = '' }) {
  const isSignup = mode === 'signup';
  const copy = COPY[mode];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [errorCode, setErrorCode] = useState('');
  const [sentTo, setSentTo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorCode('');

    const trimmedEmail = email.trim();
    if (isSignup && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (isSignup && password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { emailRedirectTo: emailRedirectTo() },
        });
        if (signUpError) throw signUpError;

        // With email confirmation on, Supabase hides whether the email is taken
        // by returning a user with no identities.
        if (data.user && data.user.identities?.length === 0) {
          const taken = new Error();
          taken.code = 'user_already_exists';
          throw taken;
        }
        // No session means the email must be confirmed before logging in.
        // With a session, App.jsx sends the user to the main page.
        if (!data.session) setSentTo(trimmedEmail);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (signInError) throw signInError;
        // App.jsx sees the new session and sends the user to the main page.
      }
    } catch (err) {
      setError(friendlyError(err));
      setErrorCode(err.code || '');
    } finally {
      setLoading(false);
    }
  };

  const startOver = () => {
    setSentTo('');
    setPassword('');
    setConfirm('');
  };

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader current={mode} />
      <main className="auth" id="main">
        <section className="auth__panel" aria-labelledby="auth-title">
          <div className="auth__panel-content">
            <p className="auth__eyebrow">{copy.eyebrow}</p>
            <h1 className="auth__title" id="auth-title">{copy.title}</h1>
            <p className="auth__lead">{copy.lead}</p>
          </div>
        </section>

        <section className="auth__body">
          {sentTo ? (
            <CheckEmail email={sentTo} onBack={startOver} />
          ) : (
            <form className="auth__card" onSubmit={handleSubmit} aria-busy={loading}>
              {error && (
                <div className="auth__error" role="alert">
                  <p>{error}</p>
                  {errorCode === 'email_not_confirmed' && email.trim() && (
                    <ResendButton email={email.trim()} />
                  )}
                </div>
              )}

              <div className="field">
                <label htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="field">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  required
                  minLength={isSignup ? MIN_PASSWORD_LENGTH : undefined}
                  aria-describedby={isSignup ? 'password-hint' : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                {isSignup && (
                  <p className="field__hint" id="password-hint">At least {MIN_PASSWORD_LENGTH} characters.</p>
                )}
              </div>

              {isSignup && (
                <div className="field">
                  <label htmlFor="auth-confirm">Confirm password</label>
                  <input
                    id="auth-confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}

              <button className="btn btn--primary auth__submit" type="submit" disabled={loading}>
                {loading && <span className="spinner" aria-hidden="true"></span>}
                {loading ? copy.submitting : copy.submit}
              </button>

              <p className="auth__switch">
                {isSignup ? (
                  <>Already have an account? <a href="#/login">Log in</a></>
                ) : (
                  <>New to We Movers? <a href="#/signup">Create an account</a></>
                )}
              </p>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
