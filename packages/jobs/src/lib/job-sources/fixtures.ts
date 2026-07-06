import type { RawJobListing } from "./types";

/**
 * Sample raw dataset items from `cheap_scraper/linkedin-job-scraper` (trimmed from
 * the actor's published output sample) plus crafted edge cases. Used to test the
 * adapter mapping without live spend, and by later phases as feed fixtures.
 *
 * Coverage:
 * - `linkedinScoredItem` — fully populated, scored, `dynamicFilterMatch: true`.
 * - `linkedinFilteredItem` — scored but `dynamicFilterMatch: false` (ranker drops it).
 * - `linkedinUnscoredItem` — no `resumeKeywords` echoed back (score fields absent).
 * - `linkedinMissingIdItem` — no `jobId` (maps to `null`, skipped).
 */

export const linkedinScoredItem: RawJobListing = {
	jobId: "4354494117",
	jobTitle: "Full-Stack Software Engineer, Inference",
	location: "Montreal, Quebec, Canada",
	salaryInfo: [],
	postedTime: "6 hours ago",
	publishedAt: "2026-06-14T00:00:00.000Z",
	searchString: "Full Stack Developer - Montreal, Canada",
	jobUrl:
		"https://ca.linkedin.com/jobs/view/full-stack-software-engineer-inference-at-cohere-4354494117?trk=public_jobs_topcard-title",
	companyName: "Cohere",
	companyUrl: "https://ca.linkedin.com/company/cohere-ai?trk=public_jobs_topcard-org-name",
	companyLogo: "https://media.licdn.com/dms/image/cohere_ai_logo",
	jobDescription:
		"Who are we?\n\nCohere is the leading security-first enterprise AI company. We build cutting-edge foundation AI models and end-to-end products that are designed to solve real-world business problems. We're training and deploying frontier models for enterprises who are building AI systems. As a Senior Software Engineer, you will improve the platform's auth, billing, and payment systems, add new features to the interactive Playground where customers can try our models, and implement new platform features for managing deployments. You may be a good fit if you have 5+ years of experience writing clean backend code. Our stack includes Golang and React.",
	applicationsCount: "Over 200 applicants",
	contractType: "Full-time",
	experienceLevel: "Mid-Senior level",
	yearsOfExperience: [{ years: "5+", context: "writing clean backend code", lang: "en" }],
	workType: "Engineering and Information Technology",
	sector: "Software Development",
	posterFullName: "",
	posterProfileUrl: "",
	companyId: "24024765",
	applyUrl: "https://ca.linkedin.com/jobs/view/full-stack-software-engineer-inference-at-cohere-4354494117",
	applyType: "EXTERNAL",
	dynamicFilterMatch: true,
	matchedKeywords: ["React", "Tools"],
	unmatchedKeywords: ["TypeScript", "Node.js", "SQL"],
	keywordMatchScorePercentage: 40,
};

export const linkedinFilteredItem: RawJobListing = {
	jobId: "4354490001",
	jobTitle: "Sales Development Representative",
	location: "Toronto, Ontario, Canada",
	publishedAt: "2026-06-13T00:00:00.000Z",
	jobUrl: "https://ca.linkedin.com/jobs/view/sales-development-representative-4354490001",
	companyName: "Randstad",
	jobDescription: "We are hiring an SDR to join our staffing team and drive outbound pipeline.",
	contractType: "Contract",
	experienceLevel: "Associate",
	dynamicFilterMatch: false,
	matchedKeywords: [],
	unmatchedKeywords: ["TypeScript", "Node.js", "React", "SQL", "Tools"],
	keywordMatchScorePercentage: 0,
};

export const linkedinUnscoredItem: RawJobListing = {
	jobId: "4354488888",
	jobTitle: "Backend Engineer",
	location: "Remote",
	publishedAt: "2026-06-12T00:00:00.000Z",
	jobUrl: "https://www.linkedin.com/jobs/view/backend-engineer-4354488888",
	applyUrl: "https://jobs.example.com/apply/4354488888",
	companyName: "Acme Corp",
	jobDescription: "Build and operate our backend services.",
	contractType: "Full-time",
	experienceLevel: "Not Applicable",
};

export const linkedinMissingIdItem: RawJobListing = {
	jobId: null,
	jobTitle: "Ghost Listing",
	jobUrl: null,
	applyUrl: null,
	companyName: "Nowhere Inc",
};

/** All fixtures in dataset order, as the actor would return them. */
export const linkedinSample: RawJobListing[] = [
	linkedinScoredItem,
	linkedinFilteredItem,
	linkedinUnscoredItem,
	linkedinMissingIdItem,
];
