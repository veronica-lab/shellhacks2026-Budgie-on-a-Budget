import { useEffect, useRef, useState } from 'react';
import './Home.css';
import logo from './assets/albertou.png';
import heroPhoto from './assets/mainpic.png';
import EventsNearYou from './EventsNearYou.jsx';

function SiteHeader() {
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

  return (
    <header className="site-header" ref={headerRef}>
      <nav className="nav" aria-label="Main">
        <a className="brand" href="#top">
          <img className="brand__logo" src={logo} alt="We Movers home" width="256" height="256" />
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
            <li><a href="#community">Events near you</a></li>
            <li><a href="#advertise">Advertise with us</a></li>
            <li><a href="#/map">Explore map</a></li>
          </ul>
          {/* Log in / Sign up: point these at the real auth pages once they exist. */}
          <div className="nav__account">
            <a className="pill pill--solid" href="#account">Log in</a>
            <a className="pill pill--outline" href="#account">Sign up</a>
          </div>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero__media">
        <img
          src={heroPhoto}
          alt="A fluffy white dog peeking out of a cardboard box among moving boxes and houseplants in a sunny apartment"
          width="2048"
          height="1155"
        />
      </div>

      <div className="hero__panel">
        <div className="hero__content">
          <h1 className="hero__title" id="hero-title">
            <span className="hero__title-small">Find your place</span>
            <span className="hero__title-big">Find your people</span>
          </h1>
          <p className="hero__text">
            Moving is more than finding an address. Discover neighborhoods that fit your life,
            then find the people and places that make them feel like home.
          </p>
          <div className="hero__actions">
            <a className="btn btn--secondary" href="#community">Find local events</a>
            <a className="btn btn--secondary" href="#explore-neighborhoods">Explore neighborhoods</a>
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
            Moving is two jobs: choosing the right place, then making it yours. We&nbsp;Movers helps with both.
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
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__notes">
        <p id="advertise"><strong>Advertise with us:</strong> local business listings are coming soon.</p>
        <p id="account"><strong>Accounts:</strong> log in and sign up are coming soon.</p>
      </div>
      <p>&copy; 2026 We Movers. Built at ShellHacks.</p>
    </footer>
  );
}

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <HowItWorks />
        <EventsNearYou />
      </main>
      <SiteFooter />
    </>
  );
}
