"""
Domain error classes representing business-level failures.
NOT HTTP errors. Routes convert these to appropriate HTTP responses.
"""


class DomainError(Exception):
    """Base class for all domain errors."""
    pass


class VolunteerNotFound(DomainError):
    """Volunteer does not exist."""
    pass


class VolunteerAlreadyRegistered(DomainError):
    """Volunteer has already completed registration."""
    pass


class InvalidVolunteerState(DomainError):
    """Volunteer state transition is not allowed."""
    pass


class DuplicateFieldVisit(DomainError):
    """Field visit contact already exists."""
    pass


class InvalidStudyAssignment(DomainError):
    """Study assignment violates business rules."""
    pass


class AuthenticationFailed(DomainError):
    """Invalid credentials or token."""
    pass


class PermissionDenied(DomainError):
    """User lacks required permission."""
    pass


class ImmutableFieldModified(DomainError):
    """Attempt to modify an immutable field."""
    pass
