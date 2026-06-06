/** Categories a member can pick when reporting an issue. */
export const ISSUE_CATEGORIES = [
  'Safety',
  'Access / Gates',
  'Disturbance / Antisocial',
  'Wildlife / Conservation',
  'App / Feedback',
  'Other',
] as const

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number]

/** Optional location for an issue (kept separate from bag-return locations). */
export const ISSUE_LOCATIONS = ['Sands', 'Marshes', 'Elsewhere'] as const

export type IssueLocation = (typeof ISSUE_LOCATIONS)[number]
