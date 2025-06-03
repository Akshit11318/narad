import { VALIDATION_RULES } from './constants';
import type { ValidationError, LoginCredentials, RegisterData } from '../types';

export function validateVoterId(voterId: string): ValidationError | null {
  if (!voterId.trim()) {
    return { field: 'voterId', message: 'Voter ID is required' };
  }

  if (voterId.length < VALIDATION_RULES.VOTER_ID.MIN_LENGTH) {
    return {
      field: 'voterId',
      message: `Voter ID must be at least ${VALIDATION_RULES.VOTER_ID.MIN_LENGTH} characters`,
    };
  }

  if (voterId.length > VALIDATION_RULES.VOTER_ID.MAX_LENGTH) {
    return {
      field: 'voterId',
      message: `Voter ID must be no more than ${VALIDATION_RULES.VOTER_ID.MAX_LENGTH} characters`,
    };
  }

  if (!VALIDATION_RULES.VOTER_ID.PATTERN.test(voterId)) {
    return {
      field: 'voterId',
      message: 'Voter ID must contain only uppercase letters and numbers',
    };
  }

  return null;
}

export function validatePassword(password: string): ValidationError | null {
  if (!password) {
    return { field: 'password', message: 'Password is required' };
  }

  if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
    return {
      field: 'password',
      message: `Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters`,
    };
  }

  if (password.length > VALIDATION_RULES.PASSWORD.MAX_LENGTH) {
    return {
      field: 'password',
      message: `Password must be no more than ${VALIDATION_RULES.PASSWORD.MAX_LENGTH} characters`,
    };
  }

  return null;
}

export function validateName(name: string): ValidationError | null {
  if (!name.trim()) {
    return { field: 'name', message: 'Name is required' };
  }

  if (name.length < VALIDATION_RULES.NAME.MIN_LENGTH) {
    return {
      field: 'name',
      message: `Name must be at least ${VALIDATION_RULES.NAME.MIN_LENGTH} characters`,
    };
  }

  if (name.length > VALIDATION_RULES.NAME.MAX_LENGTH) {
    return {
      field: 'name',
      message: `Name must be no more than ${VALIDATION_RULES.NAME.MAX_LENGTH} characters`,
    };
  }

  if (!VALIDATION_RULES.NAME.PATTERN.test(name)) {
    return {
      field: 'name',
      message: 'Name must contain only letters and spaces',
    };
  }

  return null;
}

export function validateEmail(email: string): ValidationError | null {
  if (!email.trim()) {
    return { field: 'email', message: 'Email is required' };
  }

  if (!VALIDATION_RULES.EMAIL.PATTERN.test(email)) {
    return {
      field: 'email',
      message: 'Please enter a valid email address',
    };
  }

  return null;
}

export function validatePhone(phone: string): ValidationError | null {
  if (!phone.trim()) {
    return { field: 'phone', message: 'Phone number is required' };
  }

  if (phone.length < VALIDATION_RULES.PHONE.MIN_LENGTH) {
    return {
      field: 'phone',
      message: `Phone number must be at least ${VALIDATION_RULES.PHONE.MIN_LENGTH} digits`,
    };
  }

  if (phone.length > VALIDATION_RULES.PHONE.MAX_LENGTH) {
    return {
      field: 'phone',
      message: `Phone number must be no more than ${VALIDATION_RULES.PHONE.MAX_LENGTH} digits`,
    };
  }

  if (!VALIDATION_RULES.PHONE.PATTERN.test(phone)) {
    return {
      field: 'phone',
      message: 'Please enter a valid phone number',
    };
  }

  return null;
}

export function validateLoginForm(credentials: LoginCredentials): ValidationError[] {
  const errors: ValidationError[] = [];

  const voterIdError = validateVoterId(credentials.voterId);
  if (voterIdError) errors.push(voterIdError);

  const passwordError = validatePassword(credentials.password);
  if (passwordError) errors.push(passwordError);

  return errors;
}

export function validateRegisterForm(data: RegisterData): ValidationError[] {
  const errors: ValidationError[] = [];

  const nameError = validateName(data.name);
  if (nameError) errors.push(nameError);

  const emailError = validateEmail(data.email);
  if (emailError) errors.push(emailError);

  const phoneError = validatePhone(data.phone);
  if (phoneError) errors.push(phoneError);

  const voterIdError = validateVoterId(data.voterId);
  if (voterIdError) errors.push(voterIdError);

  const passwordError = validatePassword(data.password);
  if (passwordError) errors.push(passwordError);

  if (data.password !== data.confirmPassword) {
    errors.push({
      field: 'confirmPassword',
      message: 'Passwords do not match',
    });
  }

  return errors;
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .slice(0, 1000); // Limit length
}

export function isValidCandidateId(candidateId: number, totalCandidates: number): boolean {
  return candidateId >= 1 && candidateId <= totalCandidates && Number.isInteger(candidateId);
}

export function formatValidationErrors(errors: ValidationError[]): Record<string, string> {
  return errors.reduce((acc, error) => {
    acc[error.field] = error.message;
    return acc;
  }, {} as Record<string, string>);
}
