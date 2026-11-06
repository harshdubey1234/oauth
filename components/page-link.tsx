import type { ComponentPropsWithoutRef } from "react";

type PageLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  href: string;
};

/**
 * Use document navigation for page transitions. The deployed Vinext Link shim
 * throws before fetching its destination; ordinary anchors keep every route
 * usable without depending on the client router or its prefetch runtime.
 */
export function PageLink({ children, ...props }: PageLinkProps) {
  return <a {...props}>{children}</a>;
}
