import { PageLink } from "@/components/page-link";
import { Shell } from "@/components/shell";
export default function NotFound() {
  return (
    <Shell>
      <div className="empty-state">
        <h1>This path isn’t on the map.</h1>
        <p>The guide may not exist, or the link may be incomplete.</p>
        <PageLink href="/" className="button primary">
          Return to guide library
        </PageLink>
      </div>
    </Shell>
  );
}
