import { Empty, EmptyDescription } from "@/components/ui/empty";

interface ResumeDocumentEmptyStateProps {
	message: string;
}

export const ResumeDocumentEmptyState = ({ message }: ResumeDocumentEmptyStateProps) => (
	<Empty className="rounded-lg border">
		<EmptyDescription>{message}</EmptyDescription>
	</Empty>
);
