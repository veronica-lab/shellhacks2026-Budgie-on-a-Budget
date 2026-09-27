import { useEffect, useRef, useState } from 'react';
import './Home.css';
import heroPhoto from './assets/mainpic.png';
import yardPhoto from '../mainpics/friendly-yard.jpg';
import streetFairPhoto from '../mainpics/Community Gathering.jpg';
import rooftopPhoto from '../mainpics/0712vo3.jpg';
import conferencePhoto from '../mainpics/Event_Technology_Trends-Cvent_CONNECT_2023.jpg';
import { supabase } from './supabaseClient.js';
import './Portal.css';
import EventFeedCard from './EventFeedCard.jsx';

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

// Signed-in visitors see a user icon; it opens a small panel with their email.
function UserMenu({ email }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);

  // Close on a click outside, or on Escape (focus goes back to the icon).
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        buttonRef.current.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  return (
    <div className="nav__user" ref={wrapRef}>
      <button
        ref={buttonRef}
        className="nav__user-btn"
        type="button"
        aria-expanded={open}
        aria-controls="nav-user-panel"
        aria-label="Your account"
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
          <circle cx="12" cy="8.5" r="3.6" />
          <path d="M5 19.5c1.2-3.4 4-5.2 7-5.2s5.8 1.8 7 5.2" />
        </svg>
      </button>
      {open && (
        <div className="nav__user-panel" id="nav-user-panel">
          <p className="nav__user-label">Signed in as</p>
          <p className="nav__user-email">{email}</p>
        </div>
      )}
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
        <UserMenu email={session.user.email} />
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
          {/* The link's text names the site, so the bird is decorative here */}
          <img className="brand__logo" src="/ALBERDIE%20(2).png" alt="" width="1308" height="1497" />
          <span className="brand__text">
            <span className="brand__name">Budgie on a Budget</span>
          </span>
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
            <li>
              <a className="nav__home" href="#top" aria-current={current === 'home' ? 'page' : undefined}>
                <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
                  <path d="M3 9.5 10 3.5l7 6V17h-4.5v-4.5h-5V17H3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
                Home
              </a>
            </li>
            <li><a href="#/community" aria-current={current === 'community' ? 'page' : undefined}>Community</a></li>
            <li><a href="#/budget" aria-current={current === 'budget' ? 'page' : undefined}>Budget advisor</a></li>
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
            <span className="hero__title-small">Find a place you love.</span>
            <span className="hero__title-big">Stay within your&nbsp;budget.</span>
          </h1>
          <p className="hero__text">
            Moving is more than finding an address. Discover neighborhoods that fit your life,
            then find the people and places that make them feel like home.
          </p>
          <div className="hero__actions">
            <a className="btn btn--secondary" href="#/community">Find local events</a>
            <a className="btn btn--secondary" href="#/map">Explore neighborhoods</a>
            <a className="btn btn--primary" href="#/quiz">Take the quiz!</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/// ---------- How it works: a three-slide feature carousel ----------
// The track is a native scroll-snap row, so every slide is plain content that can be
// swiped or scrolled; the buttons, counter and arrow keys are an enhancement on top.
// Preview numbers are examples and labeled as such.

// ZIP dots around a work pin, colored by commute time like the map's own legend
const MAP_DOTS = [
  [300, 150, 'near'], [352, 118, 'near'], [396, 170, 'near'], [330, 206, 'near'], [420, 226, 'near'], [262, 196, 'near'],
  [224, 106, 'far'], [460, 96, 'far'], [492, 188, 'far'], [240, 262, 'far'], [372, 286, 'far'], [498, 276, 'far'], [180, 170, 'far'],
];

function MapVisual() {
  return (
    <div className="slide-map">
      <svg className="slide-map__art" viewBox="0 0 560 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <rect width="560" height="360" className="slide-map__land" />
        <path className="slide-map__park" d="M40 40h110v70H40zM452 24h92v64h-92zM70 290h120v60H70z" />
        <path className="slide-map__water" d="M470 360c-12-60 20-104 90-118v118z" />
        <path className="slide-map__road slide-map__road--major" d="M0 176h560M348 0v360" />
        <path className="slide-map__road" d="M0 60h560M0 300h560M120 0v360M470 0v360M30 360L520 0" />
        <circle cx="348" cy="176" r="126" className="slide-map__radius" />
        {MAP_DOTS.map(([x, y, kind]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="11" className={`slide-map__dot slide-map__dot--${kind}`} />
        ))}
        <image href="/pinpoint.png" x="332" y="136" width="32" height="37" />
      </svg>

      {/* The map's search panel, as it looks on the real page */}
      <div className="slide-map__panel">
        <span className="slide-tag">Example</span>
        <div className="slide-map__toggles">
          <span className="is-on">Near my job</span>
          <span>Explore an area</span>
        </div>
        <p className="slide-map__label">Where do you work or study?</p>
        <p className="slide-map__field">Brickell, Miami, FL</p>
        <p className="slide-map__status">Max commute <strong>30 min</strong><br />11 areas &middot; 8 events</p>
        <p className="slide-map__legend">
          <span><i className="slide-map__swatch slide-map__swatch--near"></i>under 18 min</span>
          <span><i className="slide-map__swatch slide-map__swatch--far"></i>up to 30 min</span>
        </p>
      </div>
    </div>
  );
}

// Budget Advisor defaults: $1,850 rent on $65,000 in Florida (17.5% tax, $750 basics)
function BudgetVisual() {
  const fill = ((1850 - 900) / (4200 - 900)) * 100;
  return (
    <div className="slide-budget">
      <p className="slide-budget__label"><span className="slide-tag slide-tag--dark">Example</span> Salary needed for $1,850/mo rent</p>
      <p className="slide-budget__figure">$74,000<span>/yr</span></p>
      <div className="slide-budget__slider" aria-hidden="true">
        <span className="slide-budget__track" style={{ '--fill': `${fill}%` }}></span>
        <span className="slide-budget__ticks"><span>$900</span><span>$4,200</span></span>
      </div>
      <dl className="slide-budget__rows">
        <div><dt>Take-home on $65,000</dt><dd>$4,469</dd></div>
        <div><dt>Rent</dt><dd>&minus;$1,850</dd></div>
        <div><dt>Utilities &amp; groceries</dt><dd>&minus;$750</dd></div>
        <div className="slide-budget__total"><dt>Left each month</dt><dd>$1,869</dd></div>
      </dl>
      <p className="slide-budget__upfront">Move-in cash: <strong>$5,150</strong> &middot; save $1,288/mo for 4 months</p>
    </div>
  );
}

// Two posts drawn with the community feed's own card
const EXAMPLE_POSTS = [
  {
    category: 'market',
    title: 'Saturday farmers market',
    business_name: 'Coral Way Growers',
    date_time: 'Sat, 9 AM',
    zip_code: '33145',
  },
  {
    category: 'music',
    title: 'Porch concert & block potluck',
    business_name: 'Corner Café',
    date_time: 'Fri, 6 PM',
    zip_code: '33145',
    new_mover_perk: 'Free coffee your first week',
    attendees_count: 14,
  },
];

function CommunityVisual() {
  return (
    <div className="slide-feed">
      <span className="slide-tag slide-tag--light">Example posts</span>
      <div className="slide-feed__stack">
        {EXAMPLE_POSTS.map((post) => <EventFeedCard key={post.title} event={post} as="div" />)}
      </div>
    </div>
  );
}

const SLIDES = [
  {
    id: 'find',
    kicker: 'Find',
    title: 'Find a place that fits',
    text: 'Tell the map where you work and how far you’ll commute. It shows which ZIP codes fit, with rentals and events in each.',
    href: '#/map',
    cta: 'Explore the map',
    Visual: MapVisual,
  },
  {
    id: 'plan',
    kicker: 'Plan',
    title: 'Plan what it costs',
    text: 'Slide rent and income to see the salary you’d need, what’s left each month, and the cash to move in.',
    href: '#/budget',
    cta: 'Open Budget Advisor',
    Visual: BudgetVisual,
  },
  {
    id: 'settle',
    kicker: 'Settle in',
    title: 'Feel at home sooner',
    text: 'See events and new-neighbor perks that local businesses post near your ZIP.',
    href: '#/community',
    cta: 'Browse local events',
    Visual: CommunityVisual,
  },
];

const pad = (n) => String(n).padStart(2, '0');

function HowItWorks() {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  // The counter follows the scroll position, however the visitor got there.
  // With three slides this is cheap enough to run on every scroll event.
  useEffect(() => {
    const track = trackRef.current;
    const onScroll = () => {
      const slides = [...track.children];
      let nearest = 0;
      slides.forEach((slide, i) => {
        if (Math.abs(slide.offsetLeft - track.scrollLeft) < Math.abs(slides[nearest].offsetLeft - track.scrollLeft)) nearest = i;
      });
      // At the far end the last slide can't reach the snap point, so count it as reached.
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) nearest = slides.length - 1;
      setActive(nearest);
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, []);

  const goTo = (index) => {
    const track = trackRef.current;
    const i = Math.max(0, Math.min(SLIDES.length - 1, index));
    setActive(i); // update the counter now, not when a smooth scroll settles
    track.scrollTo({ left: track.children[i].offsetLeft, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  const onKeyDown = (e) => {
    const moves = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: SLIDES.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    goTo(moves[e.key]);
  };

  return (
    <section className="intro journey" id="how-it-works" aria-labelledby="intro-title">
      <div className="journey__head">
        <div>
          <p className="eyebrow">How it works</p>
          <h2 className="intro__title" id="intro-title">
            {/* Each sentence stays whole, so a wrap falls between them */}
            <span className="nowrap">Find your place.</span> <span className="nowrap">Find your people.</span>
          </h2>
          <p className="intro__lead">
            Explore where you could live, understand what it might cost, and discover what&rsquo;s nearby when you arrive.
          </p>
        </div>

        <div className="journey__controls">
          <p className="journey__count" aria-live="polite">
            <span className="visually-hidden">Slide </span>
            <strong>{pad(active + 1)}</strong> <span aria-hidden="true">/</span><span className="visually-hidden"> of</span> {pad(SLIDES.length)}
          </p>
          <button className="journey__btn" type="button" onClick={() => goTo(active - 1)} disabled={active === 0}
            aria-controls="journey-track" aria-label="Previous slide">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button className="journey__btn" type="button" onClick={() => goTo(active + 1)} disabled={active === SLIDES.length - 1}
            aria-controls="journey-track" aria-label="Next slide">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      <div className="journey__track" id="journey-track" ref={trackRef} tabIndex={0} onKeyDown={onKeyDown}
        role="region" aria-roledescription="carousel" aria-label="How Budgie works. Use the arrow keys to move between slides.">
        {SLIDES.map(({ id, kicker, title, text, href, cta, Visual }, i) => (
          <article key={id} className={`slide slide--${id}`} role="group" aria-roledescription="slide"
            aria-labelledby={`slide-${id}-title`}>
            <div className="slide__copy">
              <p className="slide__kicker">{pad(i + 1)} &mdash; {kicker}</p>
              <h3 className="slide__title" id={`slide-${id}-title`}>{title}</h3>
              <p className="slide__text">{text}</p>
              <a className="slide__link" href={href}>{cta} <span aria-hidden="true">&rarr;</span></a>
            </div>
            <div className="slide__visual"><Visual /></div>
          </article>
        ))}
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
      <SiteHeader session={session} authLoading={authLoading} current="home" />
      <main id="main">
        <Hero />
        <HowItWorks />
      </main>
      <SiteFooter />
    </>
  );
}
