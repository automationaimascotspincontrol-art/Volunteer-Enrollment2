import re

# Read the file
with open('front-end/src/pages/recruiter/RecentEnrollment.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the button logic section and replace it
# Look for the pattern starting with "isScreening ?" and ending before the closing of the ternary
pattern = r'{/\* Action Buttons \*/}\s+{isScreening \? \('
replacement_start = '''                    {/* Action Buttons */}
                    {isPrescreening ? (
                        <button
                            onClick={() => navigate(`/registration/${volunteer.volunteer_id}`, { state: { volunteer } })}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                                transition: 'all 0.2s'
                            }}
                        >
                            Proceed to Registration
                            <ArrowRight size={20} />
                        </button>
                    ) : isScreening ? (
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={async () => {
                                    try {
                                        await api.post(`/enrollment/approve/${volunteer.volunteer_id}`);
                                        onClose();
                                        window.location.reload();
                                    } catch (err) {
                                        alert(err.response?.data?.detail || 'Failed to approve volunteer');
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    padding: '1rem',
                                    background: 'linear-gradient(90deg, #10b981, #059669)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Approve
                                <UserCheck size={20} />
                            </button>
                            <button
                                onClick={async () => {
                                    if (!confirm('Are you sure you want to reject this volunteer?')) return;
                                    try {
                                        await api.post(`/enrollment/reject/${volunteer.volunteer_id}`);
                                        onClose();
                                        window.location.reload();
                                    } catch (err) {
                                        alert(err.response?.data?.detail || 'Failed to reject volunteer');
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    padding: '1rem',
                                    background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Reject
                                <X size={20} />
                            </button>
                        </div>
                    ) : ('''

# Save with updated content - will manually edit the else portion next
print("Script created - run manually to update file")
