import { useState, FC } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { mutate } from "swr";
// mobx store
import { useMobxStore } from "lib/mobx/store-provider";
// hooks
import useToast from "hooks/use-toast";
// components
import { ConfirmWorkspaceMemberRemove } from "components/workspace";
// ui
import { CustomSelect, Tooltip } from "@plane/ui";
// icons
import { ChevronDown, Dot, XCircle } from "lucide-react";
// types
import { TUserWorkspaceRole } from "types";
// constants
import { ROLE } from "constants/workspace";

type Props = {
  member: {
    id: string;
    memberId: string;
    avatar: string;
    first_name: string;
    last_name: string;
    email: string | undefined;
    display_name: string;
    role: TUserWorkspaceRole;
    status: boolean;
    member: boolean;
    accountCreated: boolean;
  };
};

export const WorkspaceMembersListItem: FC<Props> = (props) => {
  const { member } = props;
  // router
  const router = useRouter();
  const { workspaceSlug } = router.query;
  // store
  const {
    workspaceMember: { removeMember, updateMember, deleteWorkspaceInvitation },
    user: { currentWorkspaceMemberInfo, currentWorkspaceRole, currentUser, currentUserSettings, leaveWorkspace },
  } = useMobxStore();
  const isAdmin = currentWorkspaceRole === 20;
  // states
  const [removeMemberModal, setRemoveMemberModal] = useState(false);
  // hooks
  const { setToastAlert } = useToast();

  const handleLeaveWorkspace = async () => {
    if (!workspaceSlug || !currentUserSettings) return;

    await leaveWorkspace(workspaceSlug.toString())
      .then(() => {
        if (currentUserSettings.workspace?.invites > 0) router.push("/invitations");
        else router.push("/create-workspace");
      })
      .catch((err) =>
        setToastAlert({
          type: "error",
          title: "Error",
          message: err?.error || "Something went wrong. Please try again.",
        })
      );
  };

  const handleRemoveMember = async () => {
    if (!workspaceSlug) return;

    await removeMember(workspaceSlug.toString(), member.id).catch((err) =>
      setToastAlert({
        type: "error",
        title: "Error",
        message: err?.error || "Something went wrong. Please try again.",
      })
    );
  };

  const handleRemoveInvitation = async () => {
    if (!workspaceSlug) return;

    await deleteWorkspaceInvitation(workspaceSlug.toString(), member.id)
      .then(() =>
        setToastAlert({
          type: "success",
          title: "Success",
          message: "Invitation removed successfully.",
        })
      )
      .catch((err) =>
        setToastAlert({
          type: "error",
          title: "Error",
          message: err?.error || "Something went wrong. Please try again.",
        })
      )
      .finally(() =>
        mutate(`WORKSPACE_INVITATIONS_${workspaceSlug.toString()}`, (prevData: any) => {
          if (!prevData) return prevData;

          return prevData.filter((item: any) => item.id !== member.id);
        })
      );
  };

  const handleRemove = async () => {
    if (member.member) {
      const memberId = member.memberId;

      if (memberId === currentUser?.id) await handleLeaveWorkspace();
      else await handleRemoveMember();
    } else await handleRemoveInvitation();
  };

  if (!currentWorkspaceMemberInfo) return null;

  return (
    <>
      <ConfirmWorkspaceMemberRemove
        isOpen={removeMemberModal}
        onClose={() => setRemoveMemberModal(false)}
        data={member}
        onSubmit={handleRemove}
      />
      <div className="group flex items-center justify-between px-3 py-4 hover:bg-custom-background-90">
        <div className="flex items-center gap-x-4 gap-y-2">
          {member.avatar && member.avatar !== "" ? (
            <Link href={`/${workspaceSlug}/profile/${member.memberId}`}>
              <a className="relative flex h-10 w-10 items-center justify-center rounded p-4 capitalize text-white">
                <img
                  src={member.avatar}
                  className="absolute top-0 left-0 h-full w-full object-cover rounded"
                  alt={member.display_name || member.email}
                />
              </a>
            </Link>
          ) : (
            <Link href={`/${workspaceSlug}/profile/${member.memberId}`}>
              <a className="relative flex h-10 w-10 items-center justify-center rounded p-4 capitalize bg-gray-700 text-white">
                {(member.email ?? member.display_name ?? "?")[0]}
              </a>
            </Link>
          )}
          <div>
            {member.member ? (
              <Link href={`/${workspaceSlug}/profile/${member.memberId}`}>
                <a className="text-sm font-medium">
                  {member.first_name} {member.last_name}
                </a>
              </Link>
            ) : (
              <h4 className="text-sm cursor-default">{member.display_name || member.email}</h4>
            )}
            <div className="flex items-center">
              <p className="text-xs text-custom-text-300">{member.display_name}</p>
              {isAdmin && (
                <>
                  <Dot height={16} width={16} className="text-custom-text-300" />
                  <p className="text-xs text-custom-text-300">{member.email}</p>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {!member?.status && (
            <div className="flex items-center justify-center rounded bg-yellow-500/20 px-2.5 py-1 text-center text-xs text-yellow-500 font-medium">
              <p>Pending</p>
            </div>
          )}
          {member?.status && !member?.accountCreated && (
            <div className="flex items-center justify-center rounded bg-blue-500/20 px-2.5 py-1 text-center text-xs text-blue-500 font-medium">
              <p>Account not created</p>
            </div>
          )}
          <CustomSelect
            customButton={
              <div className="flex item-center gap-1 px-2 py-0.5 rounded">
                <span
                  className={`flex items-center text-xs font-medium rounded ${
                    member.memberId !== currentWorkspaceMemberInfo.member ? "" : "text-custom-sidebar-text-400"
                  }`}
                >
                  {ROLE[member.role as keyof typeof ROLE]}
                </span>
                {member.memberId !== currentWorkspaceMemberInfo.member && (
                  <span className="grid place-items-center">
                    <ChevronDown className="h-3 w-3" />
                  </span>
                )}
              </div>
            }
            value={member.role}
            onChange={(value: TUserWorkspaceRole | undefined) => {
              if (!workspaceSlug || !value) return;

              updateMember(workspaceSlug.toString(), member.id, {
                role: value,
              }).catch(() => {
                setToastAlert({
                  type: "error",
                  title: "Error!",
                  message: "An error occurred while updating member role. Please try again.",
                });
              });
            }}
            disabled={
              member.memberId === currentWorkspaceMemberInfo.member ||
              !member.status ||
              Boolean(currentWorkspaceRole && currentWorkspaceRole !== 20 && currentWorkspaceRole < member.role)
            }
            placement="bottom-end"
          >
            {Object.keys(ROLE).map((key) => {
              if (currentWorkspaceRole && currentWorkspaceRole !== 20 && currentWorkspaceRole < parseInt(key))
                return null;

              return (
                <CustomSelect.Option key={key} value={parseInt(key, 10)}>
                  <>{ROLE[parseInt(key) as keyof typeof ROLE]}</>
                </CustomSelect.Option>
              );
            })}
          </CustomSelect>
          {isAdmin && (
            <Tooltip
              tooltipContent={
                member.memberId === currentWorkspaceMemberInfo.member ? "Leave workspace" : "Remove member"
              }
            >
              <button
                type="button"
                onClick={() => setRemoveMemberModal(true)}
                className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
              >
                <XCircle className="h-3.5 w-3.5 text-custom-text-400" strokeWidth={2} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </>
  );
};
