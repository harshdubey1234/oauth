import { brandLogos, siteLogos } from "@/lib/brand-logos";

const INK = "#121915";

/** Brand colours too pale to read on a white tile fall back to ink. */
function legible(hex: string) {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? INK : `#${hex}`;
}

function lookup<T>(map: Record<string, T>, name: string): T | undefined {
  if (map[name]) return map[name];
  const key = Object.keys(map).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? map[key] : undefined;
}

export function hasBrandLogo(name: string) {
  return Boolean(lookup(brandLogos, name) || lookup(siteLogos, name));
}

/**
 * The provider's real mark: a Simple Icons path (CC0) or the icon the brand publishes on its own
 * site, saved under /public/logos. Falls back to the initial. Decorative — the name is always
 * rendered next to it.
 */
export function BrandLogo({ name, size = 24 }: { name: string; size?: number }) {
  const mark = lookup(brandLogos, name);
  if (mark) {
    return (
      <svg className="brand-logo" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
        <path d={mark.path} fill={legible(mark.hex)} />
      </svg>
    );
  }
  const file = lookup(siteLogos, name);
  if (file) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tiny static icon, no optimisation needed
      <img className="brand-logo" src={file} width={size} height={size} alt="" loading="lazy" decoding="async" />
    );
  }
  return (
    <span className="brand-logo brand-initial" style={{ width: size, height: size, fontSize: size * 0.62 }} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function ProviderIcon({ name, large = false }: { name: string; large?: boolean }) {
  const kind = name.toLowerCase().replace(/\s+/g, "-");
  return (
    <span className={`provider-icon ${kind} ${large ? "large" : ""}`}>
      <BrandLogo name={name} size={large ? 30 : 24} />
    </span>
  );
}
