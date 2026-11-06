import { CalendarDays, ChevronsUp, CircleDashed, CircleDot, ClipboardList, Cloud, Gamepad2, GitFork, Hash, ListChecks, Mail, NotebookPen, PackageOpen, PanelsTopLeft, PenTool, Plug, ShoppingBag, Table2, Triangle, Video, Workflow, type LucideIcon } from "lucide-react";
const icons: Record<string, LucideIcon> = {
  github: GitFork, slack: Hash, gmail: Mail, tally: ClipboardList,
  notion: NotebookPen, linear: CircleDashed, discord: Gamepad2, trello: PanelsTopLeft,
  asana: CircleDot, todoist: ListChecks, airtable: Table2, dropbox: PackageOpen,
  "google-drive": Triangle, "google-calendar": CalendarDays, "microsoft-outlook": Mail,
  clickup: ChevronsUp, figma: PenTool, hubspot: Workflow, salesforce: Cloud,
  zoom: Video, shopify: ShoppingBag,
};
export function ProviderIcon({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  const kind = name.toLowerCase().replace(/\s+/g, "-");
  const Icon = icons[kind] || Plug;
  return (
    <span className={`provider-icon ${kind} ${large ? "large" : ""}`}>
      <Icon size={large ? 28 : 23} strokeWidth={kind === "github" ? 2 : 2.3} />
    </span>
  );
}
