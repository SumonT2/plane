import { useRouter } from "next/router";
import { observer } from "mobx-react-lite";
import { Command } from "cmdk";
import { LinkIcon, Signal, Trash2, UserMinus2, UserPlus2 } from "lucide-react";
// mobx store
import { useMobxStore } from "lib/mobx/store-provider";
// hooks
import useToast from "hooks/use-toast";
// ui
import { DoubleCircleIcon, UserGroupIcon } from "@plane/ui";
// helpers
import { copyTextToClipboard } from "helpers/string.helper";
// types
import { IIssue } from "types";

type Props = {
  closePalette: () => void;
  issueDetails: IIssue | undefined;
  pages: string[];
  setPages: (pages: string[]) => void;
  setPlaceholder: (placeholder: string) => void;
  setSearchTerm: (searchTerm: string) => void;
};

export const CommandPaletteIssueActions: React.FC<Props> = observer((props) => {
  const { closePalette, issueDetails, pages, setPages, setPlaceholder, setSearchTerm } = props;

  const router = useRouter();
  const { workspaceSlug, projectId } = router.query;

  const {
    commandPalette: { toggleCommandPaletteModal, toggleDeleteIssueModal },
    issueDetail: { updateIssue },
    user: { currentUser },
  } = useMobxStore();

  const { setToastAlert } = useToast();

  const handleUpdateIssue = async (formData: Partial<IIssue>) => {
    if (!workspaceSlug || !projectId || !issueDetails) return;

    const payload = { ...formData };
    await updateIssue(workspaceSlug.toString(), projectId.toString(), issueDetails.id, payload).catch((e) => {
      console.error(e);
    });
  };

  const handleIssueAssignees = (assignee: string) => {
    if (!issueDetails || !assignee) return;

    closePalette();
    const updatedAssignees = issueDetails.assignees ?? [];

    if (updatedAssignees.includes(assignee)) updatedAssignees.splice(updatedAssignees.indexOf(assignee), 1);
    else updatedAssignees.push(assignee);

    handleUpdateIssue({ assignees: updatedAssignees });
  };

  const deleteIssue = () => {
    toggleCommandPaletteModal(false);
    toggleDeleteIssueModal(true);
  };

  const copyIssueUrlToClipboard = () => {
    if (!router.query.issueId) return;

    const url = new URL(window.location.href);
    copyTextToClipboard(url.href)
      .then(() => {
        setToastAlert({
          type: "success",
          title: "Copied to clipboard",
        });
      })
      .catch(() => {
        setToastAlert({
          type: "error",
          title: "Some error occurred",
        });
      });
  };

  return (
    <Command.Group heading="Issue actions">
      <Command.Item
        onSelect={() => {
          setPlaceholder("Change state...");
          setSearchTerm("");
          setPages([...pages, "change-issue-state"]);
        }}
        className="focus:outline-none"
      >
        <div className="flex items-center gap-2 text-custom-text-200">
          <DoubleCircleIcon className="h-3.5 w-3.5" />
          Change state...
        </div>
      </Command.Item>
      <Command.Item
        onSelect={() => {
          setPlaceholder("Change priority...");
          setSearchTerm("");
          setPages([...pages, "change-issue-priority"]);
        }}
        className="focus:outline-none"
      >
        <div className="flex items-center gap-2 text-custom-text-200">
          <Signal className="h-3.5 w-3.5" />
          Change priority...
        </div>
      </Command.Item>
      <Command.Item
        onSelect={() => {
          setPlaceholder("Assign to...");
          setSearchTerm("");
          setPages([...pages, "change-issue-assignee"]);
        }}
        className="focus:outline-none"
      >
        <div className="flex items-center gap-2 text-custom-text-200">
          <UserGroupIcon className="h-3.5 w-3.5" />
          Assign to...
        </div>
      </Command.Item>
      <Command.Item
        onSelect={() => {
          handleIssueAssignees(currentUser?.id ?? "");
          setSearchTerm("");
        }}
        className="focus:outline-none"
      >
        <div className="flex items-center gap-2 text-custom-text-200">
          {issueDetails?.assignees.includes(currentUser?.id ?? "") ? (
            <>
              <UserMinus2 className="h-3.5 w-3.5" />
              Un-assign from me
            </>
          ) : (
            <>
              <UserPlus2 className="h-3.5 w-3.5" />
              Assign to me
            </>
          )}
        </div>
      </Command.Item>
      <Command.Item onSelect={deleteIssue} className="focus:outline-none">
        <div className="flex items-center gap-2 text-custom-text-200">
          <Trash2 className="h-3.5 w-3.5" />
          Delete issue
        </div>
      </Command.Item>
      <Command.Item
        onSelect={() => {
          closePalette();
          copyIssueUrlToClipboard();
        }}
        className="focus:outline-none"
      >
        <div className="flex items-center gap-2 text-custom-text-200">
          <LinkIcon className="h-3.5 w-3.5" />
          Copy issue URL
        </div>
      </Command.Item>
    </Command.Group>
  );
});
