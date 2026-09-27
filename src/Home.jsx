import { useEffect, useRef, useState } from 'react';
import './Home.css';
import heroPhoto from './assets/mainpic.png';
import yardPhoto from '../mainpics/friendly-yard.jpg';
import streetFairPhoto from '../mainpics/Community Gathering.jpg';
import rooftopPhoto from '../mainpics/0712vo3.jpg';
import conferencePhoto from '../mainpics/Event_Technology_Trends-Cvent_CONNECT_2023.jpg';
import { supabase } from './supabaseClient.js';

const HERO_SLIDES = [
  {
    src: heroPhoto,
    width: 2048,
    height: 1155,
    position: '44% 50%',
    alt: 'A fluffy white dog peeking out of a cardboard box among moving boxes and houseplants in a sunny apartment',
  },
  {
    src: yardPhoto,
    width: 1955,
    height: 1570,
    alt: 'Neighbors and children chatting in the garden in front of an orange stucco house, with a stone path leading to the sidewalk',
  },
  {
    src: streetFairPhoto,
    width: 4331,
    height: 2006,
    alt: 'A neighborhood street fair with white canopy tents, balloons, and crowds browsing tables along a residential street',
  },
  {
    src: rooftopPhoto,
    width: 840,
    height: 558,
    alt: 'An evening outdoor festival on a rooftop plaza, with crowds mingling between white tents and glowing lanterns below city towers',
  },
  {
    src: conferencePhoto,
    width: 2048,
    height: 1365,
    alt: 'A packed conference ballroom seen from behind two video cameras, with attendees at round tables facing a brightly lit stage',
  },
];

const SLIDE_MS = 4000;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

// Crossfading photo carousel for the hero. Pauses on hover and while its dots
// have focus; never auto-advances when the visitor prefers reduced motion.
function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const paused = hovered || focused || reducedMotion;

  // Re-armed on every slide change, so picking a dot restarts the wait.
  useEffect(() => {
    if (paused) return undefined;
    const timer = setTimeout(() => setActive((i) => (i + 1) % HERO_SLIDES.length), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [active, paused]);

  return (
    <div
      className="hero__media"
      role="group"
      aria-roledescription="carousel"
      aria-label="Community photos"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      {HERO_SLIDES.map((slide, i) => (
        <img
          key={slide.src}
          className={`hero__slide${i === active ? ' is-active' : ''}`}
          src={slide.src}
          alt={slide.alt}
          width={slide.width}
          height={slide.height}
          style={slide.position && { objectPosition: slide.position }}
          aria-hidden={i === active ? undefined : 'true'}
          decoding="async"
          fetchPriority={i === 0 ? 'high' : undefined}
        />
      ))}

      <div className="hero__dots">
        {HERO_SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            className="hero__dot"
            type="button"
            aria-label={`Show photo ${i + 1} of ${HERO_SLIDES.length}`}
            aria-current={i === active ? 'true' : undefined}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </div>
  );
}

function AccountLinks({ session, authLoading, current }) {
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  const signOut = async () => {
    setSigningOut(true);
    setSignOutError('');
    const { error } = await supabase.auth.signOut();
    if (error) setSignOutError("Couldn't log out. Please try again.");
    setSigningOut(false);
  };

  // Hold the space while the saved session loads, so "Log in" doesn't flash.
  if (authLoading) return <div className="nav__account" aria-hidden="true"></div>;

  if (session) {
    return (
      <div className="nav__account">
        <span className="nav__user" title={session.user.email}>{session.user.email}</span>
        <button className="pill pill--outline" type="button" onClick={signOut} disabled={signingOut}>
          {signingOut ? 'Logging out…' : 'Log out'}
        </button>
        {signOutError && <p className="nav__error" role="alert">{signOutError}</p>}
      </div>
    );
  }

  return (
    <div className="nav__account">
      <a className="pill pill--solid" href="#/login" aria-current={current === 'login' ? 'page' : undefined}>Log in</a>
      <a className="pill pill--outline" href="#/signup" aria-current={current === 'signup' ? 'page' : undefined}>Sign up</a>
    </div>
  );
}

const HIDE_AFTER_PX = 100;
const SCROLL_TOLERANCE_PX = 8;

// True once the visitor scrolls down past HIDE_AFTER_PX; false again on any
// upward scroll. Movements under SCROLL_TOLERANCE_PX are ignored (but still
// add up), so small wobbles don't make the header flicker.
function useHideOnScrollDown() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (y <= HIDE_AFTER_PX) {
        setHidden(false);
        lastY = y;
        return;
      }
      const delta = y - lastY;
      if (Math.abs(delta) < SCROLL_TOLERANCE_PX) return;
      setHidden(delta > 0);
      lastY = y;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return hidden;
}

export function SiteHeader({ session = null, authLoading = false, current }) {
  const headerRef = useRef(null);
  const toggleRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Keep the anchor-scroll offset equal to the sticky header's real height.
  useEffect(() => {
    const header = headerRef.current;
    const setHeaderHeight = () => {
      document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
    };
    setHeaderHeight();
    const observer = new ResizeObserver(setHeaderHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // Close the mobile menu with Escape and return focus to the button.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const closeOnLink = (e) => {
    if (e.target.closest('a')) setMenuOpen(false);
  };

  const scrolledAway = useHideOnScrollDown();
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const hidden = scrolledAway && !menuOpen && !keyboardFocus;

  return (
    <header
      className={`site-header${hidden ? ' is-hidden' : ''}`}
      ref={headerRef}
      // Only keyboard focus pins the header; a mouse click on a link shouldn't keep it out.
      onFocus={(e) => setKeyboardFocus(e.target.matches(':focus-visible'))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setKeyboardFocus(false);
      }}
    >
      <nav className="nav" aria-label="Main">
        <a className="brand" href="#top">
          <img className="brand__logo" src="/ALBERDIE%20(2).png" alt="Budgie logo" width="1308" height="1497" />
        </a>

        <button
          ref={toggleRef}
          className="nav__toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="nav-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="nav__toggle-bars" aria-hidden="true"></span>
          <span className="nav__toggle-text">Menu</span>
        </button>

        <div className={`nav__menu${menuOpen ? ' is-open' : ''}`} id="nav-menu" onClick={closeOnLink}>
          <ul className="nav__links">
            <li><a href="#/community" aria-current={current === 'community' ? 'page' : undefined}>Community</a></li>
            <li><a href="#/business" aria-current={current === 'business' ? 'page' : undefined}>Advertise with us</a></li>
            <li><a href="#/map">Explore map</a></li>
          </ul>
          <AccountLinks session={session} authLoading={authLoading} current={current} />
        </div>
      </nav>
    </header>
  );
}

// The hero text animates in on the first page load only, not when the
// visitor comes back to the homepage from another route.
let heroHasEntered = false;

function Hero() {
  const [animateIn] = useState(() => !heroHasEntered);

  useEffect(() => {
    heroHasEntered = true;
  }, []);

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <HeroCarousel />

      <div className="hero__panel">
        <div className={`hero__content${animateIn ? ' hero__content--enter' : ''}`}>
          <h1 className="hero__title" id="hero-title">
            <span className="hero__title-small">Find your place</span>
            <span className="hero__title-big">Find your people</span>
          </h1>
          <p className="hero__text">
            Moving is more than finding an address. Discover neighborhoods that fit your life,
            then find the people and places that make them feel like home.
          </p>
          <div className="hero__actions">
            <a className="btn btn--secondary" href="#/community">Find local events</a>
            <a className="btn btn--secondary" href="#/map">Explore neighborhoods</a>
            <a className="btn btn--primary" href="#how-it-works">Take the quiz!</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="intro" id="how-it-works" aria-labelledby="intro-title">
      <div className="intro__inner">
        <div className="intro__copy">
          <p className="eyebrow">How it works</p>
          <h2 className="intro__title" id="intro-title">From first search to first&nbsp;hello.</h2>
          <p className="intro__lead">
            Moving is two jobs: choosing the right place, then making it yours. Budgie helps with both.
          </p>
          <dl className="phases">
            <div className="phase">
              <dt>Before the move</dt>
              <dd>Compare neighborhoods by budget, commute, and what matters to you.</dd>
            </div>
            <div className="phase">
              <dt>After the move</dt>
              <dd>Find local events, businesses, and neighbors nearby.</dd>
            </div>
          </dl>

          <aside className="tip" aria-label="Budgie tip">
            {/* Decorative: the text already names Budgie, so the mascot adds nothing for screen readers */}
            <img className="tip__mascot" src="/ALBERDIE%20(2).png" alt="" width="1308" height="1497" loading="lazy" />
            <p className="tip__text">
              <strong className="tip__label">Budgie tip:</strong> Start with what matters most to you&#8288;&mdash;your
              budget, your commute, or the kind of community you want nearby.
            </p>
          </aside>
        </div>

        {/* Product preview. Everything in here is demo content, not real listings. */}
        <div className="preview" role="group" aria-label="Product preview with demo content">
          <p className="preview__note">Preview &middot; demo content</p>

          <article className="snip snip--match" id="explore-neighborhoods" aria-labelledby="demo-match">
            <div className="snip__head">
              <p className="snip__kind">Neighborhood match</p>
              <span className="snip__demo">Demo</span>
            </div>
            <div className="snip__title-row">
              <h3 className="snip__title" id="demo-match">Linden Hill</h3>
              <p className="snip__score"><strong>92%</strong> match</p>
            </div>
            <dl className="facts">
              <div><dt>Rent</dt><dd>$1,850/mo for a 1BR, under your $2,100 budget</dd></div>
              <div><dt>Commute</dt><dd>24 min by train to your new office</dd></div>
              <div><dt>Priorities</dt><dd>Parks, walkable caf&eacute;s, quiet streets</dd></div>
            </dl>
          </article>

          {/* Location motif: dotted route from the match to a pin on the event */}
          <svg className="route" viewBox="0 0 96 56" aria-hidden="true" focusable="false">
            <path className="route__line" d="M6,0 C2,18 30,22 46,26 C64,31 84,34 88,48"></path>
            <circle className="route__pin" cx="88" cy="50" r="5"></circle>
          </svg>

          <article className="snip snip--event" aria-labelledby="demo-event">
            <div className="snip__head">
              <p className="snip__kind">Local event</p>
              <span className="snip__demo">Demo</span>
            </div>
            <h3 className="snip__title" id="demo-event">Saturday welcome walk &amp; coffee</h3>
            <p className="snip__meta">Sat, 10&nbsp;AM &middot; Fern Street Caf&eacute;, 0.4&nbsp;mi away &middot; 18 neighbors going</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__notes">
        <p><strong>Local business?</strong> <a href="#/business">Advertise with us</a></p>
      </div>
      <p>&copy; 2026 Budgie. Built at ShellHacks.</p>
    </footer>
  );
}

export default function Home({ session, authLoading }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader session={session} authLoading={authLoading} />
      <main id="main">
        <Hero />
        <HowItWorks />
      </main>
      <SiteFooter />
    </>
  );
}
