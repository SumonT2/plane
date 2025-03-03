import React, { useEffect, useRef, useState, ReactElement } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { Controller, useForm } from "react-hook-form";
// services
import { PageService } from "services/page.service";
import { FileService } from "services/file.service";
// hooks
import useUser from "hooks/use-user";
import { useDebouncedCallback } from "use-debounce";
// layouts
import { AppLayout } from "layouts/app-layout";
// components
import { PageDetailsHeader } from "components/headers/page-details";
import { EmptyState } from "components/common";
// ui
import { DocumentEditorWithRef, DocumentReadOnlyEditorWithRef } from "@plane/document-editor";
import { Spinner } from "@plane/ui";
// assets
import emptyPage from "public/empty-state/page.svg";
// helpers
import { renderDateFormat } from "helpers/date-time.helper";
// types
import { NextPageWithLayout } from "types/app";
import { IPage } from "types";
// fetch-keys
import { PAGE_DETAILS } from "constants/fetch-keys";

// services
const fileService = new FileService();
const pageService = new PageService();

const PageDetailsPage: NextPageWithLayout = () => {
  const editorRef = useRef<any>(null);

  const [isSubmitting, setIsSubmitting] = useState<"submitting" | "submitted" | "saved">("saved");

  const router = useRouter();
  const { workspaceSlug, projectId, pageId } = router.query;

  const { user } = useUser();

  const { handleSubmit, reset, getValues, control } = useForm<IPage>({
    defaultValues: { name: "" },
  });

  // =================== Fetching Page Details ======================
  const {
    data: pageDetails,
    mutate: mutatePageDetails,
    error,
  } = useSWR(
    workspaceSlug && projectId && pageId ? PAGE_DETAILS(pageId.toString()) : null,
    workspaceSlug && projectId && pageId
      ? () => pageService.getPageDetails(workspaceSlug.toString(), projectId.toString(), pageId.toString())
      : null
  );

  const updatePage = async (formData: IPage) => {
    if (!workspaceSlug || !projectId || !pageId) return;

    if (!formData.name || formData.name.length === 0 || formData.name === "") return;

    await pageService
      .patchPage(workspaceSlug.toString(), projectId.toString(), pageId.toString(), formData)
      .then(() => {
        mutatePageDetails(
          (prevData) => ({
            ...prevData,
            ...formData,
          }),
          false
        );
      });
  };

  const createPage = async (payload: Partial<IPage>) => {
    if (!workspaceSlug || !projectId) return;

    await pageService.createPage(workspaceSlug.toString(), projectId.toString(), payload);
  };

  // ================ Page Menu Actions ==================
  const duplicate_page = async () => {
    const currentPageValues = getValues();
    const formData: Partial<IPage> = {
      name: "Copy of " + currentPageValues.name,
      description_html: currentPageValues.description_html,
    };
    await createPage(formData);
  };

  const archivePage = async () => {
    if (!workspaceSlug || !projectId || !pageId) return;

    try {
      mutatePageDetails((prevData) => {
        if (!prevData) return;

        return {
          ...prevData,
          archived_at: renderDateFormat(new Date()),
        };
      }, true);

      await pageService.archivePage(workspaceSlug.toString(), projectId.toString(), pageId.toString());
    } catch (e) {
      mutatePageDetails();
    }
  };

  const unArchivePage = async () => {
    if (!workspaceSlug || !projectId || !pageId) return;

    try {
      mutatePageDetails((prevData) => {
        if (!prevData) return;

        return {
          ...prevData,
          archived_at: null,
        };
      }, false);

      await pageService.restorePage(workspaceSlug.toString(), projectId.toString(), pageId.toString());
    } catch (e) {
      mutatePageDetails();
    }
  };

  // ========================= Page Lock ==========================
  const lockPage = async () => {
    if (!workspaceSlug || !projectId || !pageId) return;

    try {
      mutatePageDetails((prevData) => {
        if (!prevData) return;

        return {
          ...prevData,
          is_locked: true,
        };
      }, false);

      await pageService.lockPage(workspaceSlug.toString(), projectId.toString(), pageId.toString());
    } catch (e) {
      mutatePageDetails();
    }
  };

  const unlockPage = async () => {
    if (!workspaceSlug || !projectId || !pageId) return;

    try {
      mutatePageDetails((prevData) => {
        if (!prevData) return;

        return {
          ...prevData,
          is_locked: false,
        };
      }, false);

      await pageService.unlockPage(workspaceSlug.toString(), projectId.toString(), pageId.toString());
    } catch (e) {
      mutatePageDetails();
    }
  };

  useEffect(() => {
    if (!pageDetails) return;

    reset({
      ...pageDetails,
    });
  }, [reset, pageDetails]);

  const debouncedFormSave = useDebouncedCallback(async () => {
    handleSubmit(updatePage)().finally(() => setIsSubmitting("submitted"));
  }, 1500);

  if (error)
    return (
      <EmptyState
        image={emptyPage}
        title="Page does not exist"
        description="The page you are looking for does not exist or has been deleted."
        primaryButton={{
          text: "View other pages",
          onClick: () => router.push(`/${workspaceSlug}/projects/${projectId}/pages`),
        }}
      />
    );

  return (
    <>
      {pageDetails ? (
        <div className="flex h-full flex-col justify-between">
          <div className="h-full w-full overflow-hidden">
            {pageDetails.is_locked || pageDetails.archived_at ? (
              <DocumentReadOnlyEditorWithRef
                ref={editorRef}
                value={pageDetails.description_html}
                customClassName={"tracking-tight self-center w-full max-w-full px-0"}
                borderOnFocus={false}
                noBorder
                documentDetails={{
                  title: pageDetails.name,
                  created_by: pageDetails.created_by,
                  created_on: pageDetails.created_at,
                  last_updated_at: pageDetails.updated_at,
                  last_updated_by: pageDetails.updated_by,
                }}
                pageLockConfig={
                  !pageDetails.archived_at && user && pageDetails.owned_by === user.id
                    ? { action: unlockPage, is_locked: pageDetails.is_locked }
                    : undefined
                }
                pageArchiveConfig={
                  user && pageDetails.owned_by === user.id
                    ? {
                        action: pageDetails.archived_at ? unArchivePage : archivePage,
                        is_archived: pageDetails.archived_at ? true : false,
                        archived_at: pageDetails.archived_at ? new Date(pageDetails.archived_at) : undefined,
                      }
                    : undefined
                }
              />
            ) : (
              <Controller
                name="description_html"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <DocumentEditorWithRef
                    documentDetails={{
                      title: pageDetails.name,
                      created_by: pageDetails.created_by,
                      created_on: pageDetails.created_at,
                      last_updated_at: pageDetails.updated_at,
                      last_updated_by: pageDetails.updated_by,
                    }}
                    uploadFile={fileService.getUploadFileFunction(workspaceSlug as string)}
                    deleteFile={fileService.deleteImage}
                    ref={editorRef}
                    debouncedUpdatesEnabled={false}
                    setIsSubmitting={setIsSubmitting}
                    value={!value || value === "" ? "<p></p>" : value}
                    customClassName="tracking-tight self-center px-0 h-full w-full"
                    onChange={(_description_json: Object, description_html: string) => {
                      onChange(description_html);
                      setIsSubmitting("submitting");
                      debouncedFormSave();
                    }}
                    duplicationConfig={{ action: duplicate_page }}
                    pageArchiveConfig={
                      user && pageDetails.owned_by === user.id
                        ? {
                            is_archived: pageDetails.archived_at ? true : false,
                            action: pageDetails.archived_at ? unArchivePage : archivePage,
                          }
                        : undefined
                    }
                    pageLockConfig={
                      user && pageDetails.owned_by === user.id ? { is_locked: false, action: lockPage } : undefined
                    }
                  />
                )}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="h-full w-full grid place-items-center">
          <Spinner />
        </div>
      )}
    </>
  );
};

PageDetailsPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <AppLayout header={<PageDetailsHeader />} withProjectWrapper>
      {page}
    </AppLayout>
  );
};

export default PageDetailsPage;
