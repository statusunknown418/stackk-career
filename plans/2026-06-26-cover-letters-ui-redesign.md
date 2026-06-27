# Cover Letters Flow UI Redesign Plan

This plan follows the `/impeccable shape` methodology to redesign the Cover Letters flow. The current implementation feels disconnected from the core design system, uses clunky modal wizards, and relies on colorful, hardcoded template designs that break the application's aesthetic.

## 1. Feature Summary
A massive UX and UI overhaul of the end-to-end Cover Letters flow (Index, Creation, and Workspace). The goal is to align the feature with the core design system and streamline the UX so generating and iterating on a letter feels like a native, premium platform capability rather than a bolt-on tool.

## 2. Primary User Action
Create, iterate, and export a highly targeted cover letter effortlessly, without fighting the UI.

## 3. Design Direction
- **Color Strategy**: Restrained. Neutral scales for structure and background, with one primary accent color for actions. Remove the hardcoded "minty" (emerald) and "blue" background gradients that clash with the app's aesthetic.
- **Theme Scene Sentence**: A focused professional refining their pitch in a clean, minimalist workspace, leveraging AI without distraction.
- **Anchor References**: 
  - Vercel's dashboard for the index/list views (clean data presentation).
  - Claude Artifacts / Notion for the Workspace (two-pane AI chat next to a sleek, typography-first document).

## 4. Layout Strategy
- **Index (`/dash/letters`)**: Move away from mixing colorful template cards and recent letters. Use a clean header with a primary "Create Cover Letter" action, followed by a refined list or grid of historical letters.
- **Creation Flow (`LettersCreateDialog` & Form)**: Replace the 2-step modal wizard. Use a unified sliding `Sheet` or a dedicated route for creation. Template selection and job details should live in a single, well-structured form view to reduce friction.
- **Workspace (`$generationId.tsx`)**: Refine the two-pane layout. The `LettersChatPanel` (left) should be a standard conversational sidebar. The `LettersArtifactPanel` (right) should abandon the "fake paper" look with colored backgrounds in favor of a sleek, native rich-text document view. Templates should dictate *typographic layout* and spacing, not colors.

## 5. Key States
- **Empty State (Index)**: Minimalist CTA to generate the first letter.
- **Creation State**: A streamlined form. Selecting an existing Resume/Job Target is the primary path (visual focus); manual entry is a secondary fallback.
- **Generating/Streaming State**: A skeleton layout in the Artifact panel that perfectly mirrors the typographic structure of the chosen template to avoid layout shift.
- **Editing State**: Seamless inline editing of the artifact.

## 6. Interaction Model
- **Entry**: User clicks "New Letter". A side `Sheet` opens.
- **Configuration**: User selects a template (presented as typographic thumbnails, not colored boxes) and a target job.
- **Generation**: Clicking "Generate" immediately routes the user to the Workspace with the skeleton loading state active.
- **Iteration**: User asks for revisions in the Chat panel; the Artifact panel streams updates in-place.
- **Export**: A subtle but accessible toolbar on the Artifact panel for "Copy" and "Download PDF".

## 7. Content Requirements
- **Templates**: Replace the visual-heavy templates (Centered, Classic, Minty, Blue) with typography-led templates (e.g., "Standard", "Modern", "Editorial"). They should use standard semantic colors (e.g., `text-foreground`, `text-muted-foreground`) so they support Dark Mode natively.
- **UI Copy**: Keep existing Spanish/English localization logic for the artifact itself.

## 8. Implementation Phases (Hand-off for Craft)
- **Phase 1 (Index & Creation)**: Convert `LettersCreateDialog` into a unified `Sheet`. Refactor `LettersCreateForm` to include template selection as a standard radio-group or card-selector input. Update the Index page layout.
- **Phase 2 (Templates)**: Rewrite `TemplateCard` and the artifact views in `LettersArtifactPanel` to use typography-based layouts rather than hardcoded Tailwind color backgrounds. Ensure Dark Mode compatibility.
- **Phase 3 (Workspace Polish)**: Refine the spatial relationship between `LettersChatPanel` and `LettersArtifactPanel`. Standardize borders, padding, and typography to match the rest of the application.
