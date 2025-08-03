import { VALIDATION_RULES } from "./constants";
import type { ValidationError, LoginCredentials, RegisterData } from "../types";

export function validateEmail(email: string): ValidationError | null {
  if (!email.trim()) {
    return { field: "email", message: "Email is required" };
  }

  if (!VALIDATION_RULES.EMAIL.PATTERN.test(email)) {
    return {
      field: "email",
      message: "Please enter a valid email address",
    };
  }

  return null;
}

export function validatePassword(password: string): ValidationError | null {
  if (!password) {
    return { field: "password", message: "Password is required" };
  }

  if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
    return {
      field: "password",
      message: `Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters`,
    };
  }

  if (password.length > VALIDATION_RULES.PASSWORD.MAX_LENGTH) {
    return {
      field: "password",
      message: `Password must be no more than ${VALIDATION_RULES.PASSWORD.MAX_LENGTH} characters`,
    };
  }

  return null;
}

export function validateVoterId(voterId: string): ValidationError | null {
  if (!voterId.trim()) {
    return { field: "voterId", message: "Voter ID is required" };
  }

  if (voterId.length < VALIDATION_RULES.VOTER_ID.MIN_LENGTH) {
    return {
      field: "voterId",
      message: `Voter ID must be at least ${VALIDATION_RULES.VOTER_ID.MIN_LENGTH} characters`,
    };
  }

  if (voterId.length > VALIDATION_RULES.VOTER_ID.MAX_LENGTH) {
    return {
      field: "voterId",
      message: `Voter ID must be no more than ${VALIDATION_RULES.VOTER_ID.MAX_LENGTH} characters`,
    };
  }

  if (!VALIDATION_RULES.VOTER_ID.PATTERN.test(voterId)) {
    return {
      field: "voterId",
      message: "Voter ID must contain only letters and numbers",
    };
  }

  return null;
}

export function validateElectionId(electionId: string): ValidationError | null {
  if (!electionId.trim()) {
    return { field: "electionId", message: "Election ID is required" };
  }

  if (electionId.length < VALIDATION_RULES.ELECTION_ID.MIN_LENGTH) {
    return {
      field: "electionId",
      message: `Election ID must be at least ${VALIDATION_RULES.ELECTION_ID.MIN_LENGTH} characters`,
    };
  }

  if (electionId.length > VALIDATION_RULES.ELECTION_ID.MAX_LENGTH) {
    return {
      field: "electionId",
      message: `Election ID must be no more than ${VALIDATION_RULES.ELECTION_ID.MAX_LENGTH} characters`,
    };
  }

  if (!VALIDATION_RULES.ELECTION_ID.PATTERN.test(electionId)) {
    return {
      field: "electionId",
      message:
        "Election ID can only contain letters, numbers, hyphens, and underscores",
    };
  }

  return null;
}

export function validateLoginForm(
  credentials: LoginCredentials
): ValidationError[] {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(credentials.email);
  if (emailError) errors.push(emailError);

  const passwordError = validatePassword(credentials.password);
  if (passwordError) errors.push(passwordError);

  return errors;
}

export function validateRegisterForm(data: RegisterData): ValidationError[] {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(data.email);
  if (emailError) errors.push(emailError);

  const passwordError = validatePassword(data.password);
  if (passwordError) errors.push(passwordError);

  if (data.password !== data.confirmPassword) {
    errors.push({
      field: "confirmPassword",
      message: "Passwords do not match",
    });
  }

  return errors;
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/['"]/g, "") // Remove quotes
    .slice(0, 1000); // Limit length
}

export function isValidCandidateId(
  candidateId: number,
  totalCandidates: number
): boolean {
  return (
    candidateId >= 1 &&
    candidateId <= totalCandidates &&
    Number.isInteger(candidateId)
  );
}

export function formatValidationErrors(
  errors: ValidationError[]
): Record<string, string> {
  return errors.reduce((acc, error) => {
    acc[error.field] = error.message;
    return acc;
  }, {} as Record<string, string>);
}
