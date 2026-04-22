import { generateReactHelpers } from "@uploadthing/react";
import type { UploadRouter } from "@/files/uploadthing";

export const { useUploadThing, uploadFiles } = generateReactHelpers<UploadRouter>();
