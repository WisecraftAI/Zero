import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { THEMES, applyTheme, getTheme } from '../lib/themes';
import './ThemePicker.scss';

function PaletteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="currentColor" opacity=".95" />
      <rect x="8.5" y="1.5" width="6" height="6" rx="1.2" fill="currentColor" opacity=".55" />
      <rect x="1.5" y="8.5" width="6" height="6" rx="1.2" fill="currentColor" opacity=".55" />
      <rect x="8.5" y="8.5" width="6" height="6" rx="1.2" fill="currentColor" opacity=".3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7.2 5.4 10l6.1-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function optionLabel(theme) {
  if (theme.id === 'light') return 'Switch to light mode';
  if (theme.id === 'dark') return 'Switch to dark mode';
  return `Switch to ${theme.label} theme`;
}

const GROUPS = [
  { scheme: 'light', label: 'Light' },
  { scheme: 'dark', label: 'Dark' },
];

export default function ThemePicker() {
  const [themeId, setThemeId] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'dark',
  );
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const listId = useId();
  const current = getTheme(themeId);

  const pinSidebar = useCallback((on) => {
    const sidebar = triggerRef.current?.closest('.sidebar');
    sidebar?.classList.toggle('sidebar--menu-open', on);
  }, []);

  const placeMenu = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 8;
    const width = 252;
    const viewportMax = Math.min(420, window.innerHeight - 16);
    if (window.innerWidth <= 768) {
      setMenuPos({
        left: 16,
        right: 16,
        bottom: 16,
        width: 'auto',
        top: 'auto',
        maxHeight: viewportMax,
      });
      return;
    }
    let left = rect.right + gap;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, rect.left - width - gap);
    }
    const bottom = Math.max(8, window.innerHeight - rect.bottom);
    const maxHeight = Math.min(viewportMax, Math.max(160, rect.bottom - 8));
    setMenuPos({ left, top: 'auto', width, bottom, right: 'auto', maxHeight });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const selectTheme = useCallback((id) => {
    applyTheme(id);
    setThemeId(id);
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const toggle = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    pinSidebar(true);
    placeMenu();
    setOpen(true);
  }, [open, pinSidebar, placeMenu]);

  useLayoutEffect(() => {
    pinSidebar(open);
    if (open) placeMenu();
    return () => pinSidebar(false);
  }, [open, pinSidebar, placeMenu]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    const onPointer = (e) => {
      const t = e.target;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('resize', placeMenu);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('resize', placeMenu);
    };
  }, [open, close, placeMenu]);

  useEffect(() => {
    if (!open || !menuRef.current) return;
    // preventScroll keeps the list at the top so every group stays discoverable,
    // even when the active theme sits far down the list.
    const selected = menuRef.current.querySelector('[aria-checked="true"]');
    selected?.focus({ preventScroll: true });
    menuRef.current.scrollTop = 0;
  }, [open]);

  const menu = open && menuPos
    ? createPortal(
        <div
          ref={menuRef}
          className="theme-menu"
          role="radiogroup"
          id={listId}
          aria-label="Color theme"
          style={{
            left: menuPos.left,
            right: menuPos.right,
            top: menuPos.top,
            bottom: menuPos.bottom,
            width: menuPos.width,
            maxHeight: menuPos.maxHeight,
          }}
        >
          <div className="theme-menu-title" id={`${listId}-title`}>Appearance</div>
          {GROUPS.map((group) => (
            <Fragment key={group.scheme}>
              <div className="theme-group-label">{group.label}</div>
              {THEMES.filter((t) => t.scheme === group.scheme).map((theme) => {
                const checked = theme.id === themeId;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    role="radio"
                    className="theme-option"
                    aria-checked={checked}
                    aria-label={optionLabel(theme)}
                    onClick={() => selectTheme(theme.id)}
                  >
                    <span
                      className="theme-swatch"
                      style={{ background: theme.swatch }}
                    >
                      <span
                        className="theme-swatch-accent"
                        style={{ background: theme.accent }}
                      />
                    </span>
                    <span className="theme-option-copy">
                      <span className="theme-option-name">{theme.label}</span>
                      <span className="theme-option-hint">{theme.hint}</span>
                    </span>
                    {checked && (
                      <span className="theme-option-check">
                        <CheckIcon />
                      </span>
                    )}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="theme-picker">
      <button
        ref={triggerRef}
        type="button"
        className="nav-item"
        onClick={toggle}
        title={current.label}
        aria-label={`Choose theme, currently ${current.label}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={listId}
      >
        <span className="nav-icon"><PaletteIcon /></span>
        <span className="nav-label">{current.label}</span>
      </button>
      {menu}
    </div>
  );
}
