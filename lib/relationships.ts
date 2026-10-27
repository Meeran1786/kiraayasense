/**
 * Client-safe labels for the Relationship enum (prisma/schema.prisma) — how
 * a reviewer knows the business they're reviewing.
 */

export const RELATIONSHIPS = [
  "TENANT_GUEST",
  "CUSTOMER",
  "EMPLOYEE",
  "STUDENT_PARENT",
  "PATIENT_FAMILY",
  "VENDOR_SUPPLIER",
  "JOB_APPLICANT",
] as const;

export type RelationshipKey = (typeof RELATIONSHIPS)[number];

export const RELATIONSHIP_LABELS: Record<RelationshipKey, string> = {
  TENANT_GUEST: "Tenant or guest",
  CUSTOMER: "Customer",
  EMPLOYEE: "Employee (current or former)",
  STUDENT_PARENT: "Student or parent",
  PATIENT_FAMILY: "Patient or family",
  VENDOR_SUPPLIER: "Vendor or supplier",
  JOB_APPLICANT: "Job applicant",
};

// Shown on a published review in place of the reviewer's name.
export const RELATIONSHIP_BADGES: Record<RelationshipKey, string> = {
  TENANT_GUEST: "Tenant / guest",
  CUSTOMER: "Customer",
  EMPLOYEE: "Employee",
  STUDENT_PARENT: "Student / parent",
  PATIENT_FAMILY: "Patient / family",
  VENDOR_SUPPLIER: "Vendor",
  JOB_APPLICANT: "Job applicant",
};
