import { useEffect, useRef, useState } from 'react';
import './Auth.css';
import './Portal.css';
import './BusinessPage.css';
import { SiteHeader } from './Home.jsx';
import EventFeedCard from './EventFeedCard.jsx';
import { EVENT_CATEGORIES } from './eventCategories.js';
import { api, publishEvent } from './eventStore.js';
// Phillip Pessar, CC BY 4.0 (resized). Source and license: mainpics/CREDITS.md
import storefrontPhoto from '../mainpics/rosetta-bakery-brickell.jpg';

// One post, one form. "What's happening?" is what residents read as the description.
const EMPTY_POST = {
  business_name: '',
  address: '',
  zip_code: '',
  date_time: '',
  description: '',
  title: '',
  category: '',
  new_mover_perk: '',
};

// Same "Fri • 7:00 PM" style as the mock events, with the date added.
function formatEventDate(value) {
  const d = new Date(value);
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} • ${time}`;
}

function nowForInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function validate(post, { forAi }) {
  const errors = {};
  if (!post.business_name.trim()) errors.business_name = 'Enter your business name.';
  if (!/^\d{5}$/.test(post.zip_code.trim())) errors.zip_code = 'Enter a 5-digit ZIP code.';
  if (!post.date_time) errors.date_time = 'Pick a date and time.';
  else if (new Date(post.date_time) < new Date()) errors.date_time = 'Pick a time in the future.';
  if (!forAi && !post.address.trim()) errors.address = 'Enter the street address.';
  if (forAi) {
    if (post.description.trim().length < 10) errors.description = 'Jot down a few more details so we have something to work with.';
  } else {
    if (!post.description.trim()) errors.description = 'Tell neighbors what’s happening.';
    if (!post.title.trim()) errors.title = 'Add a title, or use “Help me write it.”';
    if (!post.category) errors.category = 'Pick a category.';
  }
  return errors;
}

// Server and client field names -> input ids, for moving focus to the first problem.
const FIELD_IDS = {
  business_name: 'bp-business-name',
  address: 'bp-address',
  zip_code: 'bp-zip-code',
  date_time: 'bp-date-time',
  description: 'bp-description',
  notes: 'bp-description',
  title: 'bp-title',
  category: 'bp-category',
  new_mover_perk: 'bp-perk',
};

function focusFirstError(errors) {
  const first = Object.keys(FIELD_IDS).find((key) => errors[key]);
  if (first) document.getElementById(FIELD_IDS[first])?.focus();
}

function Field({ id, label, error, hint, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="field__hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="field__error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}

const describedBy = (id, { hint, error }) =>
  [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

// "Step 1 / Your business": the same eyebrow-over-title pattern as the homepage phases.
function StepLegend({ step, title, optional }) {
  return (
    <legend className="biz-step__legend">
      <span className="biz-step__num">Step {step}</span>
      <span className="biz-step__title">
        {title}
        {optional && <span className="biz-step__optional"> (optional)</span>}
      </span>
    </legend>
  );
}

// Shows a server error: what went wrong, plus the exact fix when there is one.
function ErrorBox({ lead, error }) {
  return (
    <div className="auth__error biz-error" role="alert">
      <p>{lead} {error.message}</p>
      {error.fix && <p className="portal__fix"><strong>How to fix:</strong> {error.fix}</p>}
    </div>
  );
}

function PostComposer() {
  const [post, setPost] = useState(EMPTY_POST);
  const [errors, setErrors] = useState({});
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiWarnings, setAiWarnings] = useState([]);
  const [beforeAi, setBeforeAi] = useState(null); // what the AI replaced, for "Undo"
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [published, setPublished] = useState(null);
  const titleRef = useRef(null);
  const publishedRef = useRef(null);

  useEffect(() => {
    if (published) publishedRef.current?.focus();
  }, [published]);

  const busy = generating || publishing;
  const set = (key) => (e) => setPost((p) => ({ ...p, [key]: e.target.value }));

  const generate = async () => {
    const found = validate(post, { forAi: true });
    setErrors(found);
    setAiError(null);
    setPublishError(null);
    setPublished(null);
    if (Object.keys(found).length) {
      focusFirstError(found);
      return;
    }

    setGenerating(true);
    let data;
    try {
      // Snowflake Cortex, through the Budgie server (which holds the Snowflake token).
      data = await api('/api/generate-event-copy', {
        method: 'POST',
        body: JSON.stringify({
          business_name: post.business_name.trim(),
          zip_code: post.zip_code.trim(),
          date_time: new Date(post.date_time).toISOString(),
          notes: post.description.trim(),
        }),
      });
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      setAiError(err);
      return;
    } finally {
      setGenerating(false);
    }

    const s = data?.suggestion;
    if (!s?.title || !s?.description) {
      setAiError({ message: "The draft didn't come back usable. Try again, or write the post yourself." });
      return;
    }
    // Fill the editable fields only. Nothing is published until the business clicks "Publish post".
    setBeforeAi({ title: post.title, description: post.description, category: post.category });
    setPost((p) => ({ ...p, title: s.title, description: s.description, category: s.category }));
    setAiWarnings(data.warnings ?? []);
    titleRef.current?.focus();
  };

  const undoAi = () => {
    setPost((p) => ({ ...p, ...beforeAi }));
    setBeforeAi(null);
    setAiWarnings([]);
  };

  const publish = async (e) => {
    e.preventDefault();
    setPublished(null);
    setAiError(null);
    setPublishError(null);

    const found = validate(post, { forAi: false });
    setErrors(found);
    if (Object.keys(found).length) {
      focusFirstError(found);
      return;
    }

    setPublishing(true);
    try {
      // Only the reviewed text in the form is sent; the server re-checks it and saves it to Snowflake.
      const saved = await publishEvent({
        business_name: post.business_name.trim(),
        address: post.address.trim(),
        zip_code: post.zip_code.trim(),
        starts_at: new Date(post.date_time).toISOString(),
        date_time: formatEventDate(post.date_time),
        title: post.title.trim(),
        description: post.description.trim(),
        category: post.category,
        new_mover_perk: post.new_mover_perk.trim(),
      });
      setPublished(saved);
      setPost(EMPTY_POST);
      setBeforeAi(null);
      setAiWarnings([]);
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields);
        focusFirstError(err.fields);
      }
      setPublishError(err);
    } finally {
      setPublishing(false);
    }
  };

  // What residents will see, updated as the business types.
  const previewEvent = {
    title: post.title.trim() || 'Your post title',
    description: post.description.trim() || 'What’s happening will show here.',
    category: post.category || 'other',
    business_name: post.business_name.trim() || 'Your business',
    address: post.address.trim() || 'Street address',
    date_time: post.date_time ? formatEventDate(post.date_time) : 'Date & time',
    zip_code: post.zip_code.trim() || '•••••',
    new_mover_perk: post.new_mover_perk.trim() || null,
    is_promoted: true,
  };

  return (
    <form className="biz-form" onSubmit={publish} noValidate>
      {published && (
        <div className="auth__notice biz-published" role="status" tabIndex={-1} ref={publishedRef}>
          <strong>Your post is live!</strong> &ldquo;{published.title}&rdquo; is now in the{' '}
          <a href="#/community">Community page</a>. Want to share something else? The form is ready for your next post.
        </div>
      )}

      <div className="biz-compose">
        <div className="biz-steps">
          <fieldset className="biz-step" disabled={busy}>
            <StepLegend step={1} title="Your business" />

            <Field id="bp-business-name" label="Business name" error={errors.business_name}>
              <input id="bp-business-name" value={post.business_name} onChange={set('business_name')}
                maxLength={100} autoComplete="organization" required placeholder="e.g. Corner Coffee Roasters"
                aria-invalid={!!errors.business_name}
                aria-describedby={describedBy('bp-business-name', { error: errors.business_name })} />
            </Field>

            <div className="portal__row">
              <Field id="bp-address" label="Street address" error={errors.address}>
                <input id="bp-address" value={post.address} onChange={set('address')}
                  maxLength={200} autoComplete="street-address" required placeholder="e.g. 1234 SW 8th St, Miami, FL"
                  aria-invalid={!!errors.address}
                  aria-describedby={describedBy('bp-address', { error: errors.address })} />
              </Field>
              <Field id="bp-zip-code" label="ZIP code" error={errors.zip_code}>
                <input id="bp-zip-code" value={post.zip_code} onChange={set('zip_code')}
                  inputMode="numeric" maxLength={5} pattern="\d{5}" autoComplete="postal-code" required
                  placeholder="e.g. 33130"
                  aria-invalid={!!errors.zip_code}
                  aria-describedby={describedBy('bp-zip-code', { error: errors.zip_code })} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="biz-step" disabled={busy}>
            <StepLegend step={2} title="The event" />

            <Field id="bp-date-time" label="Date & time" error={errors.date_time}>
              <input id="bp-date-time" type="datetime-local" value={post.date_time} onChange={set('date_time')}
                min={nowForInput()} required
                aria-invalid={!!errors.date_time}
                aria-describedby={describedBy('bp-date-time', { error: errors.date_time })} />
            </Field>

            <div className="biz-helper">
              <Field id="bp-description" label="What’s happening?" error={errors.description ?? errors.notes}>
                <textarea id="bp-description" value={post.description} onChange={set('description')}
                  rows={5} maxLength={600} required
                  placeholder="e.g. live acoustic set on the patio Friday night, come say hi to the new neighbors"
                  aria-invalid={!!(errors.description ?? errors.notes)}
                  aria-describedby={describedBy('bp-description', { hint: true, error: errors.description ?? errors.notes })} />
              </Field>
              <div className="biz-helper__row">
                <img className="biz-helper__bird" src="/ALBERDIE%20(2).png" alt="" width="1308" height="1497" loading="lazy" />
                <p className="field__hint biz-helper__text" id="bp-description-hint">
                  Have the idea but not the words? Jot down a few details and Alberdie will draft a title,
                  description and category for you to edit.
                </p>
                <button className="btn biz-helper__btn" type="button" onClick={generate} aria-busy={generating}>
                  {generating && <span className="spinner" aria-hidden="true"></span>}
                  {generating ? 'Writing…' : 'Help me write it'}
                </button>
              </div>
            </div>

            <div aria-live="polite">
              {aiError && <ErrorBox lead="We couldn’t draft your post." error={aiError} />}
              {beforeAi && !aiError && (
                <div className="auth__notice biz-ai-note">
                  <p>
                    We filled in a title, description and category from your notes. Edit anything you like before
                    publishing.
                    {aiWarnings.length > 0 && (
                      <> Please double-check <strong>{aiWarnings.join(', ')}</strong>; that wasn&rsquo;t in your notes.</>
                    )}
                  </p>
                  <button className="auth__link-btn" type="button" onClick={undoAi}>Undo</button>
                </div>
              )}
            </div>

            <div className="portal__row">
              <Field id="bp-title" label="Title" error={errors.title}>
                <input id="bp-title" ref={titleRef} value={post.title} onChange={set('title')} maxLength={80} required
                  placeholder="e.g. Friday patio music"
                  aria-invalid={!!errors.title} aria-describedby={describedBy('bp-title', { error: errors.title })} />
              </Field>
              <Field id="bp-category" label="Category" error={errors.category}>
                <select id="bp-category" value={post.category} onChange={set('category')} required
                  aria-invalid={!!errors.category}
                  aria-describedby={describedBy('bp-category', { error: errors.category })}>
                  <option value="" disabled>Choose one</option>
                  {EVENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
            </div>

          </fieldset>

          <fieldset className="biz-step" disabled={busy}>
            <StepLegend step={3} title="Welcome perk" optional />

            <Field id="bp-perk" label="New-neighbor perk" error={errors.new_mover_perk}
              hint="A small welcome, like a free cookie or 10% off a first visit. Leave blank if you’re not offering one.">
              <input id="bp-perk" value={post.new_mover_perk} onChange={set('new_mover_perk')} maxLength={140}
                placeholder="e.g. Free drip coffee with your first pastry"
                aria-invalid={!!errors.new_mover_perk}
                aria-describedby={describedBy('bp-perk', { hint: true, error: errors.new_mover_perk })} />
            </Field>
          </fieldset>
        </div>

        <section className="biz-review" aria-labelledby="biz-review-title">
          <h3 className="biz-step__legend" id="biz-review-title">
            <span className="biz-step__num">Step 4</span>
            <span className="biz-step__title">Review and publish</span>
          </h3>
          <p className="biz-review__lead">
            This is your post as neighbors will see it on the Community page. It updates as you type.
          </p>

          {/* Framed like the Community page: its heading, then the same card residents get */}
          <div className="biz-review__feed">
            <p className="biz-review__feed-head">
              Community &middot; {/^\d{5}$/.test(post.zip_code.trim()) ? `Events in ${post.zip_code.trim()}` : 'Events near you'}
            </p>
            <EventFeedCard event={previewEvent} as="div" />
          </div>

          {publishError && <ErrorBox lead="Your post wasn’t published." error={publishError} />}
          <button className="btn btn--primary auth__submit biz-publish" type="submit" disabled={busy} aria-busy={publishing}>
            {publishing && <span className="spinner" aria-hidden="true"></span>}
            {publishing ? 'Publishing…' : 'Publish post'}
          </button>
        </section>
      </div>
    </form>
  );
}

export default function BusinessPage({ session, authLoading }) {
  const formHeadingRef = useRef(null);

  // Hash routing owns the URL fragment, so scroll to the form instead of linking to an anchor.
  const startPost = () => {
    const heading = formHeadingRef.current;
    heading.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    heading.focus({ preventScroll: true });
  };

  return (
    <>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main').focus(); }}>
        Skip to content
      </a>
      <SiteHeader session={session} authLoading={authLoading} current="business" />
      <main className="biz" id="main" tabIndex={-1}>
        {/* Same split as the homepage hero: a photo on one side, the olive panel with the headline on the other */}
        <section className="biz-hero" aria-labelledby="biz-title">
          <figure className="biz-hero__media">
            <img className="biz-hero__photo" src={storefrontPhoto} width="1600" height="1200" decoding="async"
              alt="Neighbors at sidewalk tables under white umbrellas outside Rosetta, an Italian bakery on a Miami street" />
            <figcaption className="biz-hero__credit">
              Rosetta Bakery, Brickell. Photo:{' '}
              <a href="https://commons.wikimedia.org/wiki/File:Rosetta_Bakery_Brickell_-_exterior.jpg" target="_blank" rel="noreferrer">
                Phillip Pessar
              </a>,{' '}
              <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>
            </figcaption>
          </figure>

          <div className="biz-hero__panel">
            <div className="biz-hero__content">
              <p className="biz-hero__eyebrow">For local businesses</p>
              <h1 className="biz-hero__title" id="biz-title">Say hello to your new neighbors</h1>
              <p className="biz-hero__text">
                People who just moved use Budgie to find their go-to coffee, bookstore and gym. Post your open mic,
                tasting or story hour, add a welcome perk, and residents in your ZIP code will see it on the
                Community page and the map.
              </p>
              <button className="btn btn--primary biz-hero__cta" type="button" onClick={startPost}>
                Create a neighborhood post
              </button>
              <aside className="tip biz-hero__tip" aria-label="Tip from Alberdie, your Budgie companion">
                <img className="tip__mascot" src="/ALBERDIE%20(2).png" alt="" width="1308" height="1497" />
                <p className="tip__text">
                  <strong className="tip__label">Alberdie&rsquo;s tip:</strong> Short on words? Jot down a few notes
                  in the form and I&rsquo;ll draft the post for you to edit.
                </p>
              </aside>
            </div>
          </div>
        </section>

        <section className="biz-post" aria-labelledby="biz-form-title">
          <div className="biz-post__inner">
            <p className="eyebrow">Neighborhood post</p>
            <h2 className="intro__title biz-post__title" id="biz-form-title" tabIndex={-1} ref={formHeadingRef}>
              What&rsquo;s happening at your place?
            </h2>
            <p className="intro__lead biz-post__lead">
              Four short steps. Everything is required except the welcome perk, and nothing goes live until you
              click <strong>Publish post</strong>.
            </p>
            <PostComposer />
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <p>&copy; 2026 Budgie. Built at ShellHacks. &middot; <a href="#/community">See the Community page</a></p>
      </footer>
    </>
  );
}
